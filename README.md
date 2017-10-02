# babel-plugin-transform-react-pure-components
Optimize React code by transforming pure components into stateless functional components.

## Example

In:

```js
class MyComponent extends React.Component {
  static propTypes = {
    className: React.PropTypes.string.isRequired
  };

  render() {
    return (
      <div className={this.props.className}>
        ...
      </div>
    );
  }
}
```

Out:

```js
function MyComponent(props) {
  return (
    <div className={props.className}>
      ...
    </div>
  );
}

MyComponent.propTypes = {
  className: React.PropTypes.string.isRequired
};
```

## Installation

```sh
$ npm install babel-plugin-transform-react-pure-components
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["transform-react-pure-components"]
}
```

### Via CLI

```sh
$ babel --plugins transform-react-pure-components script.js
```

### Via Node API

```js
require("babel-core").transform("code", {
  plugins: ["transform-react-pure-components"]
});
```

## Options

* `pureComponents = false` &mdash; Transform components extending `React.PureComponent` classes (this effectively converts them back to `React.Component`).
* `assignDefaultProps = false` &mdash; Use `Object.assign(defaultProps, props)` to calculate the props.
