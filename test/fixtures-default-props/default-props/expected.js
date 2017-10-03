export default function Foo(props) {
  props = Object.assign({
    foo: 123
  }, props)

  props.foo;
  return <div />;
}
Foo.propTypes = {
  foo: React.PropTypes.string.isRequired
};
