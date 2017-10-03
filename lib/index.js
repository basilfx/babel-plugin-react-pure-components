'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (_ref) {
  var t = _ref.types;

  function isReactClass(path, pureComponents) {
    var superClass = path.node.superClass;

    var isDirectReactClass = t.isMemberExpression(superClass) && t.isIdentifier(superClass.object, { name: 'React' }) && (t.isIdentifier(superClass.property, { name: 'Component' }) || pureComponents && t.isIdentifier(superClass.property, { name: 'PureComponent' }));

    if (isDirectReactClass) {
      return true;
    }

    var state = {
      localComponentNames: []
    };
    var importVisitor = {
      ImportDeclaration: function ImportDeclaration(nestedPath) {
        var node = nestedPath.node;

        if (t.isStringLiteral(node.source, { value: 'react' })) {
          this.localComponentNames = node.specifiers.filter(function (specifier) {
            return t.isImportSpecifier(specifier) && (specifier.imported.name === 'Component' || pureComponents && specifier.imported.name === 'PureComponent');
          }).map(function (specifier) {
            return specifier.local.name;
          });
        }
      }
    };

    // Check for imports as local variable names.
    path.findParent(function (p) {
      return t.isProgram(p);
    }).traverse(importVisitor, state);

    if (state.localComponentNames.length === 0) {
      return false;
    }

    return state.localComponentNames.indexOf(superClass.name) !== -1;
  };

  var bodyVisitor = {
    ClassMethod: function ClassMethod(path) {
      if (path.node.key.name === 'render') {
        this.renderMethod = path;
      } else {
        this.isPure = false;
        path.stop();
      }
    },
    ClassProperty: function ClassProperty(path) {
      var name = path.node.key.name;

      if (path.node.static && (name === 'propTypes' || name === 'defaultProps')) {
        this.properties.push(path);
      } else if (!path.node.static && name === 'props' && path.node.typeAnnotation) {
        return;
      } else {
        this.isPure = false;
      }
    },
    MemberExpression: function MemberExpression(path) {
      var node = path.node;

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
    JSXIdentifier: function JSXIdentifier(path) {
      if (path.node.name === 'ref') {
        this.isPure = false;
        path.stop();
      }
    }
  };

  return {
    visitor: {
      Class: function Class(path, options) {
        // Apply only to React.Component or React.PureComponent classes.
        if (!isReactClass(path, options.opts.pureComponents)) {
          return;
        }

        var state = {
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

        var id = t.identifier(path.node.id.name);

        var replacement = [];

        var renameProps = state.renderMethod.node.body.body.some(function (statement) {
          var isVariableDeclaration = statement.type === 'VariableDeclaration';
          return isVariableDeclaration && statement.declarations.filter(function (declr) {
            return declr.id.name === 'props';
          }).length;
        });

        state.thisProps.forEach(function (thisProp) {
          thisProp.replaceWith(t.identifier(renameProps ? '__props' : 'props'));
        });

        var functionalComponent = t.functionDeclaration(id, [t.identifier(renameProps ? '__props' : 'props')], state.renderMethod.node.body);

        // Replace defaultProps with an Object.assign on entry.
        if (options.opts.assignDefaultProps) {
          var defaultProps = state.properties.find(function (prop) {
            return prop.node.key.name === 'defaultProps';
          });

          if (defaultProps) {
            state.properties = state.properties.filter(function (prop) {
              return prop.node.key.name !== 'defaultProps';
            });

            if (defaultProps.node.value.properties.length) {
              // One option is to hoist the default props to the parent scope,
              // so they are not allocated each time you instantiate the method.
              var temp = void 0;

              if (options.opts.assignDefaultProps === 'hoist') {
                var tempId = path.scope.generateUidIdentifier("defaultProps");

                path.scope.parent.push({
                  id: tempId,
                  kind: 'const',
                  init: defaultProps.node.value
                });

                temp = [t.objectExpression([]), tempId];
              } else {
                temp = [defaultProps.node.value];
              }

              functionalComponent.body.body.unshift(t.assignmentExpression('=', t.identifier(renameProps ? '__props' : 'props'), t.callExpression(t.memberExpression(t.identifier('Object'), t.identifier('assign')), [].concat(_toConsumableArray(temp), [t.identifier(renameProps ? '__props' : 'props')]))));
            }
          }
        }

        replacement.push(functionalComponent);

        var staticProps = state.properties.map(function (prop) {
          return t.expressionStatement(t.assignmentExpression('=', t.memberExpression(id, prop.node.key), prop.node.value));
        });

        if (t.isExpression(path.node)) {
          // Wrap with IIFE for expressions.
          var iife = [functionalComponent].concat(_toConsumableArray(staticProps), [t.returnStatement(id)]);
          path.replaceWith(t.callExpression(t.functionExpression(null, [], t.blockStatement(iife)), []));
        } else if (t.isExportDeclaration(path.parent)) {
          // Fix "We don't know what to do with this node type" errors
          // for ES6 default/named exports.
          path.replaceWith(functionalComponent);
          path.parentPath.insertAfter(staticProps);
        } else {
          // Everything else
          var _replacement = [functionalComponent].concat(_toConsumableArray(staticProps));
          path.replaceWithMultiple(_replacement);
        }
      }
    }
  };
};

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

;