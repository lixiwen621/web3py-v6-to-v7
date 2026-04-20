from web3.middleware import ENSNameToAddressMiddleware
from web3.middleware import ExtraDataToPOAMiddleware

w3.middleware_onion.inject(ENSNameToAddressMiddleware, layer=0)
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=1)
