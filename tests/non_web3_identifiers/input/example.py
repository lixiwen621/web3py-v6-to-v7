class CallOverride:
    pass


class SolidityError(Exception):
    pass


def encodeABI(data):
    return data


name_to_address_middleware = "custom-handler"
geth_poa_middleware = "custom-poa"
WebsocketProvider = "local-provider"
