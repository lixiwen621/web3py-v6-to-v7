from web3.middleware import construct_sign_and_send_raw_middleware

w3.middleware_onion.inject(construct_sign_and_send_raw_middleware(private_key), layer=0)
