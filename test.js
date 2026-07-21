const fs = require('fs'); const text = fs.readFileSync('index.html', 'utf8'); const script = text.split('<script type="module">')[1].split('</script>')[0]; fs.writeFileSync('temp.js', script);
