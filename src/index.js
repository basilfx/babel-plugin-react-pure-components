export default function({ types: t }) {
  function isReactClass(path, pureComponents) {
    const superClass = path.node.superClass;

    const isDirectReactClass = (
      t.isMemberExpression(superClass) &&
      t.isIdentifier(superClass.object, { name: 'React' }) &&
      (
        t.isIdentifier(superClass.property, { name: 'Component' }) ||
        (
          pureComponents &&
          t.isIdentifier(superClass.property, { name: 'PureComponent' })
        )
      )
    );

    if (isDirectReactClass) {
      return true;
    }

    const state = {
      localComponentNames: []
    };
    const importVisitor = {
      ImportDeclaration(nestedPath) {
        const node = nestedPath.node;

        if (t.isStringLiteral(node.source, { value: 'react' })) {
          this.localComponentNames = node.specifiers
            .filter(specifier => (
              t.isImportSpecifier(specifier) &&
              (
                specifier.imported.name === 'Component' || (
                  pureComponents &&
                  specifier.imported.name === 'PureComponent'
                )
              )
            ))
            .map(specifier => specifier.local.name);
          }
        }
    };

    // Check for imports as local variable names.
    path.findParent(p => t.isProgram(p)).traverse(importVisitor, state);

    if (state.localComponentNames.length === 0) {
      return false;
    }

    return state.localComponentNames.indexOf(superClass.name) !== -1;
  };

  const bodyVisitor = {
    ClassMethod(path) {
      if (path.node.key.name === 'render') {
        this.renderMethod = path;
      } else {
        this.isPure = false;
        path.stop();
      }
    },

    ClassProperty(path) {
      const name = path.node.key.name;

      if (path.node.static && (
        name === 'propTypes' ||
        name === 'defaultProps'
      )) {
        this.properties.push(path);
      } else if (!path.node.static && (
        name === 'props' && path.node.typeAnnotation
      )) {
        return;
      } else {
        this.isPure = false;
      }
    },

    MemberExpression(path) {
      const { node } = path;

      // Non-this member expressions dont matter.
      if (!t.isThisExpression(node.object)) {
        return;
      }

      // Don't allow this.<anything other than props>.
      if (!t.isIdentifier(node.property, { name: 'props' })) {
        this.isPure = false;
        path.stop();
        return;
      }

      // Rewrite this.props.foo => props.foo.
      this.thisProps.push(path);
    },

    JSXIdentifier(path) {
      if (path.node.name === 'ref') {
        this.isPure = false;
        path.stop();
      }
    }
  };

  return {
    visitor: {
      Class(path, options) {
        // Apply only to React.Component or React.PureComponent classes.
        if (!isReactClass(path, options.opts.pureComponents)) {
          return;
        }

        const state = {
          renderMethod: null,
          properties: [],
          thisProps: [],
          isPure: true
        };

        // Get the render method and make sure it doesn't have any other
        // methods.
        path.traverse(bodyVisitor, state);

        if (!state.isPure || !state.renderMethod) {
          // Not a class that can be converted to a functional component.
          return;
        }

        const id = t.identifier(path.node.id.name);

        const replacement = [];

        const renameProps = state.renderMethod.node.body.body.some(function(statement) {
            const isVariableDeclaration = statement.type === 'VariableDeclaration';
            return isVariableDeclaration && statement.declarations.filter(declr => declr.id.name === 'props').length;
        });

        state.thisProps.forEach(function(thisProp) {
          thisProp.replaceWith(t.identifier(renameProps ? '__props': 'props'));
        });

        const functionalComponent = t.functionDeclaration(
          id,
          [t.identifier(renameProps ? '__props': 'props')],
          state.renderMethod.node.body
        );

        // Replace defaultProps with an Object.assign on entry.
        if (options.opts.assignDefaultProps) {
          const defaultProps = state.properties.find(
            prop => prop.node.key.name === 'defaultProps'
          );

          if (defaultProps) {
            state.properties = state.properties.filter(
              prop => prop.node.key.name !== 'defaultProps'
            );

            const tempId = path.scope.generateUidIdentifier("defaultProps");

            path.scope.parent.push({
              id: tempId,
              kind: 'const',
              init: defaultProps.node.value
            })

            functionalComponent.body.body.unshift(
              t.assignmentExpression(
                '=',
                t.identifier(renameProps ? '__props': 'props'),
                t.callExpression(
                  t.memberExpression(
                    t.identifier('Object'),
                    t.identifier('assign')
                  ),
                  [
                    t.objectExpression([]),
                    tempId,
                    t.identifier(renameProps ? '__props': 'props'),
                  ]
                )
              )
            )
          }
        }

        replacement.push(functionalComponent);

        const staticProps = state.properties.map(prop => t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.memberExpression(id, prop.node.key),
            prop.node.value
          )
        ));

        if (t.isExpression(path.node)) {
          // Wrap with IIFE for expressions.
          const iife = [
            functionalComponent,
            ...staticProps,
            t.returnStatement(id)
          ];
          path.replaceWith(
            t.callExpression(
              t.functionExpression(
                null,
                [],
                t.blockStatement(iife)
              ),
              []
            )
          );
        } else if (t.isExportDeclaration(path.parent)) {
          // Fix "We don't know what to do with this node type" errors
          // for ES6 default/named exports.
          path.replaceWith(functionalComponent);
          path.parentPath.insertAfter(staticProps);
        } else {
          // Everything else
          const replacement = [functionalComponent, ...staticProps];
          path.replaceWithMultiple(replacement);
        }
      }
    }
  };
};
