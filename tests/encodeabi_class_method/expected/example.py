from web3 import Web3


class MyContract:
    def encodeABI(self, data):
        return data.encode()


def test():
    mc = MyContract()
    # Should NOT be renamed — this is a local class method, not a web3 call
    result = mc.encode_abi("hello")

    # This SHOULD be renamed — it's a web3 contract method
    result2 = w3.eth.contract().encode_abi(fn_name="transfer", args=[])
