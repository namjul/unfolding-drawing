
import b4a from 'b4a' // Module for buffer-to-string and vice-versa conversions
import { signal, always } from 'spellcaster/spellcaster.js'
import { tag, text, css, component, h } from 'spellcaster/hyperscript.js'

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
    conn.on('data', (data: any) => console.log(`${name}: ${data}`))
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
  const button = tag('button')

  const Counter = () => {
    const [count, setCount] = signal(0)

    return div(
      { className: 'content' },
      [
        div({ className: 'counter-text' }, text(count)),
        button(
          {
            className: 'counter-button',
            onclick: () => {
              send("Hello world")
              setCount(count() + 1)
            }
          },
          text('Increment')
        ),
      ]
    )

  }

  const rootEl = document.querySelector('#root');


  if (rootEl) {
    rootEl.append(Counter())
  }
}
