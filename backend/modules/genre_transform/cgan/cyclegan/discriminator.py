import torch
import torch.nn as nn


class Discriminator(nn.Module):
    """
    PatchGAN Discriminator for mel spectrograms.

    Input : (B, 1, 80, T)
    Output: (B, 1, H', W') — patch-level real/fake predictions
    """
    def __init__(self):
        super().__init__()

        self.model = nn.Sequential(
            # No InstanceNorm on first layer (standard PatchGAN)
            nn.Conv2d(1, 64, kernel_size=4, stride=2, padding=1),
            nn.LeakyReLU(0.2, inplace=True),

            nn.Conv2d(64, 128, kernel_size=4, stride=2, padding=1),
            nn.InstanceNorm2d(128),
            nn.LeakyReLU(0.2, inplace=True),

            nn.Conv2d(128, 256, kernel_size=4, stride=2, padding=1),
            nn.InstanceNorm2d(256),
            nn.LeakyReLU(0.2, inplace=True),

            nn.Conv2d(256, 512, kernel_size=4, stride=1, padding=1),
            nn.InstanceNorm2d(512),
            nn.LeakyReLU(0.2, inplace=True),

            # Final patch prediction
            nn.Conv2d(512, 1, kernel_size=4, stride=1, padding=1),
        )

    def forward(self, x):
        return self.model(x)
