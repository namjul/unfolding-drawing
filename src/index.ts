import { signal, always } from 'spellcaster/spellcaster.js'
import { tag, text, css, component, h } from 'spellcaster/hyperscript.js'
import './pear'

import './index.css';


const div = tag('div')
const button = tag('button')

const styles = css`
:host {
  display: block;
}
`;

component({
  tag: 'x-hello',
  styles: [styles],
  props: () => ({ hello: always("Helloooxx") }),
  render: ({ hello }) => {
    return h('div', { className: 'title' }, text(hello));
  }
});

const Counter = () => {
  const [count, setCount] = signal(0)

  return div(
    { className: 'content' },
    [
      div({ className: 'counter-text' }, text(count)),
      button(
        {
          className: 'counter-button',
          onclick: () => setCount(count() + 1)
        },
        text('Increment')
      ),
      h('x-hello')
    ]
  )

}

const rootEl = document.querySelector('#root');


if (rootEl) {
  rootEl.append(Counter())
}
