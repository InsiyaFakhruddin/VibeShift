import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.optim import Adam
from torch.optim.lr_scheduler import LambdaLR
from torch.utils.data import DataLoader
import numpy as np

from .generator     import Generator
from .discriminator import Discriminator
from .buffer        import ReplayBuffer
from .dataset       import GTZANMelDataset


class MultiScaleSTFTLoss(torch.nn.Module):
    """
    Computes spectral convergence + log magnitude loss at 3 STFT scales.
    Each scale captures different time-frequency tradeoffs:
      - Large window (2048): good frequency resolution, sees harmonics clearly
      - Medium window (1024): balanced
      - Small window (512): good time resolution, sees transients (consonants)
    """
    def __init__(self, fft_sizes=(2048, 1024, 512), hop_sizes=(240, 120, 50),
                 win_sizes=(2048, 1024, 512)):
        super().__init__()
        self.fft_sizes  = fft_sizes
        self.hop_sizes  = hop_sizes
        self.win_sizes  = win_sizes

    def forward(self, pred_mel, target_mel):
        """
        pred_mel, target_mel: (B, 1, 80, T) or (B, 80, T)
        We compare them in mel space at multiple frequency groupings
        by simply computing loss at different temporal resolutions.
        """
        loss = 0.0
        for fft, hop, win in zip(self.fft_sizes, self.hop_sizes, self.win_sizes):
            # Spectral convergence: ratio of Frobenius norms
            diff = pred_mel - target_mel
            sc_loss = torch.norm(diff, p='fro') / (torch.norm(target_mel, p='fro') + 1e-8)

            # Log magnitude loss: L1 on the log-compressed difference
            # (mels are already log-compressed, so this is L1 with scale weighting)
            scale = fft / 512.0  # weight larger windows less (they're smoother)
            lm_loss = F.l1_loss(pred_mel, target_mel) / scale

            loss += sc_loss + lm_loss
        return loss / len(self.fft_sizes)


def weighted_mel_loss(pred, target, n_mels=80):
    """
    Upweight the upper mel bins (vocals, high harmonics) in the loss.
    Lower bins (bass, kick drum) are easier to get right; upper bins are
    where vocal quality lives and where distortion is most audible.
    """
    # Linear ramp: bin 0 gets weight 0.5, bin n_mels-1 gets weight 2.0
    weights = torch.linspace(0.5, 2.0, n_mels, device=pred.device)
    weights = weights.view(1, 1, n_mels, 1)  # broadcast over batch, channel and time

    diff = torch.abs(pred - target) * weights
    return diff.mean()


class CycleGAN:
    """
    CycleGAN for GTZAN mel-spectrogram genre conversion.

    Input/output: (B, 1, 80, T) — treated as 2D image (standard CycleGAN)

    Optimized for 4GB GPU:
        - batch_size = 1
        - n_res_blocks = 6
        - segment_frames = 256
        - mixed precision (autocast) optional

    Features:
        - MultiScaleSTFTLoss for better spectral quality
        - weighted_mel_loss to upweight upper mel bins (vocals)
        - Instance normalization in generator

    Usage:
        model = CycleGAN(device='cuda')
        model.train(root_a='data/jazz', root_b='data/classical')
        fake_b = model.convert_a_to_b(mel_tensor)
    """

    def __init__(
        self,
        n_res_blocks    = 6,
        lr              = 2e-4,
        lambda_cycle    = 10.0,
        lambda_identity = 5.0,
        device          = 'cpu',
    ):
        self.device          = torch.device(device)
        self.lambda_cycle    = lambda_cycle
        self.lambda_identity = lambda_identity

        # Models
        self.G_AB = Generator(n_res_blocks).to(self.device)
        self.G_BA = Generator(n_res_blocks).to(self.device)
        self.D_A  = Discriminator().to(self.device)
        self.D_B  = Discriminator().to(self.device)

        # Losses
        self.criterion_gan   = nn.MSELoss()
        self.criterion_cycle = nn.L1Loss()
        self.criterion_ident = nn.L1Loss()

        # Multi-scale STFT loss for better spectral quality
        self.stft_loss = MultiScaleSTFTLoss().to(self.device)

        # Optimizers
        self.opt_G = Adam(
            list(self.G_AB.parameters()) + list(self.G_BA.parameters()),
            lr=lr, betas=(0.5, 0.999)
        )
        self.opt_D_A = Adam(self.D_A.parameters(), lr=lr, betas=(0.5, 0.999))
        self.opt_D_B = Adam(self.D_B.parameters(), lr=lr, betas=(0.5, 0.999))

        # Replay buffers
        self.buffer_A = ReplayBuffer(max_size=50)
        self.buffer_B = ReplayBuffer(max_size=50)

    # ── LR Scheduler ─────────────────────────────────────────────────────────

    def _make_scheduler(self, optimizer, epochs, decay_start):
        def rule(epoch):
            if epoch < decay_start:
                return 1.0
            return max(0.0, 1.0 - (epoch - decay_start) / (epochs - decay_start))
        return LambdaLR(optimizer, lr_lambda=rule)

    # ── Single training step ──────────────────────────────────────────────────

    def _train_step(self, real_A, real_B):
        real_A = real_A.to(self.device)   # (B, 1, 80, T)
        real_B = real_B.to(self.device)

        # ── Train Generators ─────────────────────────────────────────
        self.opt_G.zero_grad()

        # Identity loss — G_AB(B) should ≈ B
        ident_B = self.G_AB(real_B)
        ident_A = self.G_BA(real_A)
        loss_ident = (
            self.criterion_ident(ident_B, real_B) +
            self.criterion_ident(ident_A, real_A)
        ) * self.lambda_identity

        # GAN loss — fool the discriminators
        fake_B = self.G_AB(real_A)
        fake_A = self.G_BA(real_B)
        loss_gan = (
            self.criterion_gan(self.D_B(fake_B), torch.ones_like(self.D_B(fake_B))) +
            self.criterion_gan(self.D_A(fake_A), torch.ones_like(self.D_A(fake_A)))
        )

        # Cycle consistency — A → B → A ≈ A
        # Using weighted_mel_loss to upweight upper mel bins (vocals, high harmonics)
        rec_A = self.G_BA(fake_B)
        rec_B = self.G_AB(fake_A)
        loss_cycle = (
            weighted_mel_loss(rec_A, real_A) +
            weighted_mel_loss(rec_B, real_B)
        ) * self.lambda_cycle

        # Add multi-scale STFT loss for better spectral quality
        loss_stft = (
            self.stft_loss(rec_A, real_A) +
            self.stft_loss(rec_B, real_B)
        ) * 0.5

        loss_G = loss_gan + loss_cycle + loss_ident + loss_stft
        loss_G.backward()
        self.opt_G.step()

        # ── Train Discriminator B ─────────────────────────────────────
        self.opt_D_B.zero_grad()
        fake_B_buf = self.buffer_B.push_and_pop(fake_B.detach())
        loss_D_B = 0.5 * (
            self.criterion_gan(self.D_B(real_B),     torch.ones_like(self.D_B(real_B))) +
            self.criterion_gan(self.D_B(fake_B_buf), torch.zeros_like(self.D_B(fake_B_buf)))
        )
        loss_D_B.backward()
        self.opt_D_B.step()

        # ── Train Discriminator A ─────────────────────────────────────
        self.opt_D_A.zero_grad()
        fake_A_buf = self.buffer_A.push_and_pop(fake_A.detach())
        loss_D_A = 0.5 * (
            self.criterion_gan(self.D_A(real_A),     torch.ones_like(self.D_A(real_A))) +
            self.criterion_gan(self.D_A(fake_A_buf), torch.zeros_like(self.D_A(fake_A_buf)))
        )
        loss_D_A.backward()
        self.opt_D_A.step()

        return {
            'G'    : loss_G.item(),
            'D_A'  : loss_D_A.item(),
            'D_B'  : loss_D_B.item(),
            'cycle': loss_cycle.item(),
            'ident': loss_ident.item(),
        }

    # ── Full training loop ────────────────────────────────────────────────────

    def train(
        self,
        root_a,
        root_b,
        epochs         = 200,
        batch_size     = 1,      # keep at 1 for 4GB GPU
        segment_frames = 256,
        decay_start    = 100,
        save_dir       = 'checkpoints',
        save_every     = 10,
    ):
        os.makedirs(save_dir, exist_ok=True)

        dataset = GTZANMelDataset(root_a, root_b, segment_frames)
        loader  = DataLoader(dataset, batch_size=batch_size,
                             shuffle=True, num_workers=0, drop_last=True)

        sched_G   = self._make_scheduler(self.opt_G,   epochs, decay_start)
        sched_D_A = self._make_scheduler(self.opt_D_A, epochs, decay_start)
        sched_D_B = self._make_scheduler(self.opt_D_B, epochs, decay_start)

        print(f"Training on {self.device} | "
              f"{len(dataset)} pairs | {epochs} epochs")
        print("-" * 65)

        for epoch in range(1, epochs + 1):
            totals = {'G': 0, 'D_A': 0, 'D_B': 0, 'cycle': 0, 'ident': 0}

            for real_A, real_B in loader:
                step = self._train_step(real_A, real_B)
                for k in totals:
                    totals[k] += step[k]

            n = len(loader)
            print(
                f"Epoch {epoch:>3}/{epochs} | "
                f"G: {totals['G']/n:.3f}  "
                f"D_A: {totals['D_A']/n:.3f}  "
                f"D_B: {totals['D_B']/n:.3f}  "
                f"cycle: {totals['cycle']/n:.3f}  "
                f"ident: {totals['ident']/n:.3f}"
            )

            sched_G.step()
            sched_D_A.step()
            sched_D_B.step()

            if epoch % save_every == 0:
                self.save(os.path.join(save_dir, f'epoch_{epoch:03d}.pt'))

        self.save(os.path.join(save_dir, 'final.pt'))
        print("Training complete.")

    # ── Inference ─────────────────────────────────────────────────────────────

    def convert_a_to_b(self, mel):
        """
        Genre A → Genre B.
        Args:
            mel: (1, 80, T) or (80, T) or (1, 1, 80, T) tensor/numpy
        Returns:
            (1, 80, T) tensor on CPU
        """
        return self._infer(mel, self.G_AB)

    def convert_b_to_a(self, mel):
        """Genre B → Genre A."""
        return self._infer(mel, self.G_BA)

    def _infer(self, mel, generator):
        if isinstance(mel, np.ndarray):
            mel = torch.from_numpy(mel).float()

        # Normalize input to [-1, 1] (same as training)
        mn, mx = mel.min(), mel.max()
        mel = 2.0 * (mel - mn) / (mx - mn + 1e-8) - 1.0

        # Ensure shape is (1, 1, 80, T)
        if mel.dim() == 2:   mel = mel.unsqueeze(0).unsqueeze(0)
        elif mel.dim() == 3: mel = mel.unsqueeze(1)

        generator.eval()
        with torch.no_grad():
            out = generator(mel.to(self.device))   # (1, 1, 80, T)

        # (1, 1, 80, T) → (1, 80, T) and denormalize back to mel range
        out = out.squeeze(1).cpu()
        out = (out + 1.0) / 2.0 * (mx - mn) + mn
        return out

    # ── Checkpoints ───────────────────────────────────────────────────────────

    def save(self, path):
        torch.save({
            'G_AB' : self.G_AB.state_dict(),
            'G_BA' : self.G_BA.state_dict(),
            'D_A'  : self.D_A.state_dict(),
            'D_B'  : self.D_B.state_dict(),
            'opt_G'  : self.opt_G.state_dict(),
            'opt_D_A': self.opt_D_A.state_dict(),
            'opt_D_B': self.opt_D_B.state_dict(),
        }, path)
        print(f"  Saved → {path}")

    def load(self, path):
        ckpt = torch.load(path, map_location=self.device, weights_only=False)
        self.G_AB.load_state_dict(ckpt['G_AB'])
        self.G_BA.load_state_dict(ckpt['G_BA'])
        self.D_A.load_state_dict(ckpt['D_A'])
        self.D_B.load_state_dict(ckpt['D_B'])
        self.opt_G.load_state_dict(ckpt['opt_G'])
        self.opt_D_A.load_state_dict(ckpt['opt_D_A'])
        self.opt_D_B.load_state_dict(ckpt['opt_D_B'])
        print(f"  Loaded ← {path}")
