import { createRouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { createIsomorphicFn } from '@tanstack/react-start'

import type { RouterClient } from '@orpc/server'

type AppRouter = typeof import('@/orpc/router').default

const getORPCClient = createIsomorphicFn()
  .server(async () => {
    const { default: router } = await import('@/orpc/router')
    return createRouterClient(router, {
      context: () => ({
        headers: getRequestHeaders(),
      }),
    })
  })
  .client((): RouterClient<AppRouter> => {
    const link = new RPCLink({
      url: `${window.location.origin}/api/rpc`,
    })
    return createORPCClient(link)
  })

export const client = getORPCClient() as RouterClient<AppRouter>

export const orpc = createTanstackQueryUtils(client)
