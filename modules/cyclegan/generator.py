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

    def forward(self, x):
        x = self.encoder(x)
        x = self.res_blocks(x)
        x = self.decoder(x)
        return x
