# babel-plugin-transform-react-pure-components
Optimize React code by transforming pure components into stateless functional components.

## Introduction
In React, a pure component is a component that renders the same given the same properties and state. In addition stateless functions can replace class-based components that only rely on properties.

This Babel plugin transforms class-based components into stateless functions, if:

- The class only contains a `render()` method.
- Does not define additional (static) properties.
- Is stateless.

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

The options below may not improve performance, and may produce unpredictable results.

* `pureComponents = false` &mdash; Transform components extending `React.PureComponent` classes (this effectively converts them back to `React.Component`).
* `assignDefaultProps = false` &mdash; Use `Object.assign(defaultProps, props)` to calculate the props. Set to `hoist` to hoist them to the parent scope (can be useful in combination with [babel-plugin-transform-react-remove-prop-types](https://github.com/oliviertassinari/babel-plugin-transform-react-remove-prop-types)).


## Benchmarks
According to [this article](https://medium.com/missive-app/45-faster-react-functional-components-now-3509a668e69f), a performance boost can be expected. However, [another article](https://moduscreate.com/react_component_rendering_performance/) shows no performance boost. Nontheless, functional stateless components [may allow](https://twitter.com/dan_abramov/status/755343749983657986) for optimizations in the future.

In a (non-scientific) [benchmark](https://gist.github.com/basilfx/bd0e5ea9ebda1b40d34bf23bd3dd7835), using this plugin yields an improvement of 22% over a class-based component (React 16, 10.000 instantiations of a component, babel-preset-env @ Chrome 59).
