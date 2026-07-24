const fs = require('fs')

let file = fs.readFileSync('src/store.ts', 'utf8')

// Add usersV2 based on users value
file = file.replace(/users:\s*'([^']+)',/g, (match, val) => {
  return `users: '${val}',
        usersV2: '${val}',`
})

fs.writeFileSync('src/store.ts', file)
