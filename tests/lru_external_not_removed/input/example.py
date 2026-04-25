from web3 import Web3
from collections import OrderedDict

# LRU-like cache (NOT from web3.datastructures)
class LRU:
    def __init__(self, size):
        self.size = size
