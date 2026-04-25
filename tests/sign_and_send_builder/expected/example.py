from web3.middleware import SignAndSendRawMiddlewareBuilder

w3.middleware_onion.inject(SignAndSendRawMiddlewareBuilder.build(private_key), layer=0)
