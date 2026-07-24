const fs = require('fs')

let file = fs.readFileSync('src/store.ts', 'utf8')

// The missing sub-permissions per module
const subPerms = {
  channels: ['channels_create', 'channels_edit', 'channels_delete', 'channels_gen_code', 'channels_params'],
  landing: ['landing_create', 'landing_delete'],
  packages: ['packages_create', 'packages_edit', 'packages_status'],
  coupons: ['coupons_create', 'coupons_extend', 'coupons_revoke', 'coupons_edit'],
  users: ['users_edit'],
  sales: ['sales_claim', 'sales_dial', 'sales_update', 'sales_reassign', 'sales_config'],
  orders: [],
  system: ['system_role_add', 'system_role_edit', 'system_role_delete', 'system_acc_add', 'system_acc_edit']
}

// Function to find each `perms: { ... }` block and add the missing keys
file = file.replace(/perms:\s*\{([^}]+)\}/g, (match, body) => {
  const lines = body.split('\n')
  const currentPerms = {}
  lines.forEach(line => {
    const match = line.match(/\s*(\w+):\s*'([^']+)'/)
    if (match) {
      currentPerms[match[1]] = match[2]
    }
  })

  // We add sub-perms matching the parent's level, unless already present
  const newPerms = { ...currentPerms }
  for (const [parent, subs] of Object.entries(subPerms)) {
    const pLevel = currentPerms[parent] || 'none'
    for (const sub of subs) {
      if (!newPerms[sub]) {
        newPerms[sub] = pLevel
      }
    }
  }

  // Formatting output
  const outLines = []
  for (const [parent, subs] of Object.entries(subPerms)) {
    outLines.push(`        ${parent}: '${newPerms[parent]}',`)
    for (const sub of subs) {
      outLines.push(`        ${sub}: '${newPerms[sub]}',`)
    }
  }

  return `perms: {\n${outLines.join('\n')}\n      }`
})

fs.writeFileSync('src/store.ts', file)
