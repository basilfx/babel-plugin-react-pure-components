const _defaultProps = {
  foo: 123
};
export default function Foo(props) {
  props = Object.assign({}, _defaultProps, props)

  props.foo;
  return <div />;
}
Foo.propTypes = {
  foo: React.PropTypes.string.isRequired
};
