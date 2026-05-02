"""preprocess_data.py

Alias wrapper to run vocal stem separation before training.
This file is included so Colab/Kaggle notebooks can refer to a stable preprocessing entrypoint.
"""

from preprocess_stems import main

if __name__ == '__main__':
    main()
