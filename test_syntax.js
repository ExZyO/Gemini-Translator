const fs = require('fs'); const code = fs.readFileSync('index.html', 'utf8'); const script = code.split('<script type="module">')[1].split('</script>')[0]; fs.writeFileSync('temp.js', script);
