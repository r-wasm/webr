const encoder = new TextEncoder();
const dataFile = encoder.encode(`x, y
-3, 9
-2, 4
-1, 1
 0, 0
 1, 1
 2, 4
 3, 9
`);
const scriptFile = encoder.encode(`data <- read.csv("data.csv")
plot(data, type = 'l')
`);

const iframe = document.getElementById('webr');
iframe.addEventListener("load", function () {
  iframe.contentWindow.postMessage({
    items: [
      {
        name: 'example.R',
        path: '/home/web_user/example.R',
        data: scriptFile,
      },
      {
        name: 'data.csv',
        path: '/home/web_user/data.csv',
        data: dataFile,
      }
    ]
  }, '*');
});


