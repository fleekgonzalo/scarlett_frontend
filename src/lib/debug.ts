export const debug = {
  log: (component: string, action: string, data?: any) => {
    console.log(`[${component}] ${action}`, data ? data : '')
  },
  error: (component: string, action: string, error: any) => {
    console.error(`[${component}] ${action}:`, error)
    if (error?.stack) {
      console.error(`[${component}] Stack:`, error.stack)
    }
  },
  inspect: (component: string, object: any) => {
    console.log(`[${component}] Object inspection:`)
    for (const key in object) {
      try {
        console.log(`  ${key}:`, object[key])
        if (typeof object[key] === 'function') {
          console.log(`    (type: function, exists: true)`)
        }
      } catch (e) {
        console.error(`  Error inspecting ${key}:`, e)
      }
    }
  }
} 