# Next.js Memory Optimization Guide

## Current Configuration (2025-06-28)

The project has been configured with Next.js memory optimizations to prevent potential memory leaks and reduce memory usage.

## Applied Optimizations

### 1. Webpack Memory Optimizations
```typescript
experimental: {
  webpackMemoryOptimizations: true
}
```
- **Purpose**: Reduces maximum memory usage during builds
- **Available since**: Next.js v15.0.0
- **Trade-off**: May slightly increase compilation time

### 2. Disable Module Preloading
```typescript
experimental: {
  preloadEntriesOnStart: false
}
```
- **Purpose**: Prevents Next.js from preloading all page JavaScript modules on server startup
- **Benefit**: Reduces initial memory footprint
- **Behavior**: Modules are loaded on-demand as pages are accessed

## Common Memory Issues and Solutions

### 1. "Inflight" Request Memory Leaks
If you experience memory leaks related to inflight requests:

**Symptoms:**
- Memory usage grows continuously
- Server becomes unresponsive
- Docker containers restart frequently

**Solutions:**
1. Ensure proper cleanup in API routes:
```typescript
// Use AbortController for fetch requests
const controller = new AbortController()
const signal = controller.signal

try {
  const response = await fetch(url, { signal })
  // Process response
} finally {
  controller.abort() // Clean up
}
```

2. Implement request timeouts:
```typescript
// In API routes
export const config = {
  api: {
    responseLimit: '8mb',
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}
```

### 2. Build-Time Memory Issues
If builds fail due to memory:

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Or use memory profiling
node --heap-prof node_modules/next/dist/bin/next build
```

### 3. Runtime Memory Monitoring

Add memory monitoring to your application:

```typescript
// utils/memory-monitor.ts
export function logMemoryUsage(label: string) {
  if (process.env.NODE_ENV === 'development') {
    const used = process.memoryUsage()
    console.log(`Memory Usage [${label}]:`)
    for (let key in used) {
      console.log(`  ${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`)
    }
  }
}
```

## Docker Configuration

Ensure your Docker containers have appropriate memory limits:

```yaml
# docker-compose.yml
services:
  frontend:
    mem_limit: 1g
    memswap_limit: 1g
```

## Monitoring Tools

1. **Development**: Use `--experimental-debug-memory-usage` flag
   ```bash
   next build --experimental-debug-memory-usage
   ```

2. **Production**: Monitor with Docker stats
   ```bash
   docker stats fullstack-app-frontend-1
   ```

3. **Sentry Integration**: Your existing Sentry setup will capture memory-related errors

## Best Practices

1. **Avoid Memory Leaks in Components**:
   - Always cleanup event listeners
   - Cancel async operations in useEffect cleanup
   - Avoid storing large objects in module scope

2. **Optimize Data Fetching**:
   - Use `cache: 'no-store'` for dynamic data
   - Implement proper pagination for large datasets
   - Stream large responses when possible

3. **Image Optimization**:
   - Use Next.js Image component
   - Implement lazy loading
   - Optimize image sizes

## Version Information

- **Next.js**: 15.3.4 (latest stable)
- **React**: 19.0.0
- **Node.js**: Check with `node --version` in container

## When to Consider Upgrading

Monitor the Next.js releases for:
- Memory leak fixes in patch releases
- Performance improvements in minor releases
- Breaking changes in major releases

Check for updates:
```bash
npm outdated
```

## Resources

- [Next.js Memory Usage Guide](https://nextjs.org/docs/app/building-your-application/optimizing/memory-usage)
- [Next.js GitHub Issues](https://github.com/vercel/next.js/issues) - Search for memory-related issues
- [Sentry Performance Monitoring](https://docs.sentry.io/platforms/javascript/guides/nextjs/)