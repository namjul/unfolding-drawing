
import b4a from 'b4a' // Module for buffer-to-string and vice-versa conversions
import { signal, always } from 'spellcaster/spellcaster.js'
import { tag, text, css, component, h } from 'spellcaster/hyperscript.js'
import * as fabric from 'fabric'

let fabricCanvas: fabric.Canvas | undefined
let lock = false

export default async function (app: any) {

  console.log(app);
  const { swarm, topic } = app


  // Keep track of all connections and console.log incoming data
  const conns: any[] = []
  swarm.on('connection', (conn: any) => {
    const name = b4a.toString(conn.remotePublicKey, 'hex')
    console.log('* got a connection from:', name, '*')
    conns.push(conn)
    conn.once('close', () => conns.splice(conns.indexOf(conn), 1))
    conn.on('data', (data: string) => {

      const action = JSON.parse(data)

      if (fabricCanvas) {
        lock = true
        console.log(action)
        fabricCanvas.loadFromJSON(action.payload, fabricCanvas.renderAll.bind(fabricCanvas)).then(() => {
          lock = false
        });

        // sanitize
        fabricCanvas.getObjects().forEach(obj => {
          if (obj.type === 'path' && obj.fill) {
            obj.set('fill', null);
          }
        });
        fabricCanvas.renderAll();
      }

    })
    conn.on('error', (e: any) => console.log(`Connection error: ${e}`))
  })

  swarm.on('update', () => {
    console.log('update: ' + swarm.connections.size)
  })

  console.log("joining", topic);

  function send(msg: string) {
    for (const conn of conns) {
      conn.write(msg)
    }
  }

  // Join the swarm with the topic. Setting both client/server to true means that this app can act as both.
  const discovery = swarm.join(topic, { client: true, server: true })
  discovery.flushed().then(() => {
    console.log('joined topic:', b4a.toString(topic, 'hex'))
  })

  const div = tag('div')

  const canvas = h('canvas') as HTMLCanvasElement

  const canvasContainer = div({ className: 'p-2 basis-1/5 grow  bg-sky-50' }, [canvas])

  // on-mount
  setTimeout(() => {
    fabricCanvas = new fabric.Canvas(canvas, {
      isDrawingMode: true
    });

    // fabricCanvas.setDimensions({ width: canvasContainer.clientWidth, height: canvasContainer.clientHeight })
    fabricCanvas.setDimensions({ width: 300, height: 300 })

    fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);

    fabricCanvas.freeDrawingBrush.color = "black";
    fabricCanvas.freeDrawingBrush.width = 3;
    fabricCanvas.freeDrawingBrush.shadow = null;

    fabricCanvas.on('after:render', (e) => {
      if (!lock) {
        const json = fabricCanvas?.toDatalessJSON();
        send(JSON.stringify(({ type: 'fabricCanvas:json', payload: json })))
        console.log("save", json)
      }
    });

  })

  const App = () => {
    return div(
      { className: 'flex gap-2 h-screen p-2' },
      [
        div({ className: 'p-2 basis-1/25 grow max-w-100 bg-sky-50' }, ['View Controls']),
        canvasContainer,
        div({ className: 'p-2 basis-1/25 grow max-w-100  bg-sky-50' }, ['Transformation Controls']),
      ]
    )

  }

  const rootEl = document.querySelector('#root');


  if (rootEl) {
    rootEl.append(App())
  }
}
