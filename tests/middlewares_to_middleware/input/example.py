# Middleware configuration
w3.middleware_onion.add(cache_middleware)
w3.middlewares = [
    custom_middleware,
    another_middleware,
]
