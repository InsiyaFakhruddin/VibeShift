import random
import torch


class ReplayBuffer:
    """
    Returns a mix of newly generated and previously stored fakes.
    Prevents discriminator from overfitting to the latest generator output.
    """
    def __init__(self, max_size=50):
        self.max_size = max_size
        self.data     = []

    def push_and_pop(self, data):
        result = []
        for element in data:
            element = element.unsqueeze(0)
            if len(self.data) < self.max_size:
                self.data.append(element)
                result.append(element)
            else:
                if random.random() > 0.5:
                    idx = random.randint(0, self.max_size - 1)
                    result.append(self.data[idx].clone())
                    self.data[idx] = element
                else:
                    result.append(element)
        return torch.cat(result)
