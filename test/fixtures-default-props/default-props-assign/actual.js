export default class Foo extends React.Component {
  static propTypes = {
    foo: React.PropTypes.string.isRequired
  };
  static defaultProps = {
    foo: 123
  };

  render() {
    this.props.foo;
    return <div />;
  }
}
