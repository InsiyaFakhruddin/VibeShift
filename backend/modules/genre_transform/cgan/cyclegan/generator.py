import torch
import torch.nn as nn


class ResidualBlock(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(channels, channels, kernel_size=3, padding=1, padding_mode='reflect'),
            nn.InstanceNorm2d(channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(channels, channels, kernel_size=3, padding=1, padding_mode='reflect'),
            nn.InstanceNorm2d(channels),
        )

    def forward(self, x):
        return x + self.block(x)


class Generator(nn.Module):
    """
    2D CycleGAN Generator for mel-spectrogram genre conversion.

    Treats mel as a 2D image: (B, 1, 80, T)
    Encoder → ResBlocks → Decoder
    Output : (B, 1, 80, T) — same shape as input
    """
    def __init__(self, n_res_blocks=6):
        super().__init__()

        # ── Encoder ──────────────────────────────────────────────────
        self.encoder = nn.Sequential(
            # Initial conv: 1 → 64
            nn.Conv2d(1, 64, kernel_size=7, padding=3, padding_mode='reflect'),
            nn.InstanceNorm2d(64),
            nn.ReLU(inplace=True),

            # Downsample: 64 → 128
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),
            nn.InstanceNorm2d(128),
            nn.ReLU(inplace=True),

            # Downsample: 128 → 256
            nn.Conv2d(128, 256, kernel_size=3, stride=2, padding=1),
            nn.InstanceNorm2d(256),
            nn.ReLU(inplace=True),
        )

        # ── Residual blocks (genre style transform) ──────────────────
        # 6 blocks for 4GB GPU (9 blocks needs more VRAM)
        self.res_blocks = nn.Sequential(
            *[ResidualBlock(256) for _ in range(n_res_blocks)]
        )

        # ── Decoder ──────────────────────────────────────────────────
        self.decoder = nn.Sequential(
            # Upsample: 256 → 128
            nn.ConvTranspose2d(256, 128, kernel_size=3, stride=2,
                               padding=1, output_padding=1),
            nn.InstanceNorm2d(128),
            nn.ReLU(inplace=True),

            # Upsample: 128 → 64
            nn.ConvTranspose2d(128, 64, kernel_size=3, stride=2,
                               padding=1, output_padding=1),
            nn.InstanceNorm2d(64),
            nn.ReLU(inplace=True),

            # Output: 64 → 1
            nn.Conv2d(64, 1, kernel_size=7, padding=3, padding_mode='reflect'),
            nn.Tanh()
        )

    def _match_input_shape(self, x, target_shape):
        if x.shape == target_shape:
            return x

        delta_h = target_shape[2] - x.shape[2]
        delta_w = target_shape[3] - x.shape[3]

        # Crop if output is slightly larger than input
        if delta_h < 0 or delta_w < 0:
            x = x[:, :, :target_shape[2], :target_shape[3]]

        # Pad if output is slightly smaller than input
        if delta_h > 0 or delta_w > 0:
            pad_left = 0
            pad_right = max(delta_w, 0)
            pad_top = 0
            pad_bottom = max(delta_h, 0)
            x = nn.functional.pad(x, (pad_left, pad_right, pad_top, pad_bottom), mode='reflect')

        return x

    def forward(self, x):
        # Instance normalization: normalize each (mel, time) slice independently
        # Store stats so we can denormalize the output
        orig_shape = x.shape
        mean = x.mean(dim=[1, 2], keepdim=True)   # mean over mel bins and time
        std  = x.std(dim=[1, 2], keepdim=True) + 1e-8
        x_norm = (x - mean) / std

        x = self.encoder(x_norm)
        x = self.res_blocks(x)
        x = self.decoder(x)

        # Match output to the original input shape before denormalizing
        x = self._match_input_shape(x, orig_shape)

        # Denormalize output back to the target domain's expected scale
        # Use the INPUT stats — the genre change should shift timbre, not energy
        x = x * std + mean
        return x
