// @flow

type Props = {
  foo: string
};

export default class Foo extends React.Component<Props> {
  props: Props;

  static propTypes = {
    foo: React.PropTypes.string.isRequired
  };

  render() {
    this.props.foo;
    return <div />;
  }
}
