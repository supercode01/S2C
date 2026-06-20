export const isPublicRoutes = ['/auth(.*)', '/']
export const isProtectedRoutes = ['/dashboard(.*)', '/billing(.*)']

export const isByPassRoutes = [
    '/api/polar/webhook',
    '/api/inngest(.*)',
    '/api/auth(.*)',
    '/convex(.*)',
]