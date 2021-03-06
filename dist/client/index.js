"use strict";

var _interopRequireDefault = require("@babel/runtime-corejs2/helpers/interopRequireDefault");

var _assign = _interopRequireDefault(require("@babel/runtime-corejs2/core-js/object/assign"));

var _regenerator = _interopRequireDefault(require("@babel/runtime-corejs2/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime-corejs2/helpers/asyncToGenerator"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime-corejs2/helpers/slicedToArray"));

var _promise = _interopRequireDefault(require("@babel/runtime-corejs2/core-js/promise"));

var __importDefault = void 0 && (void 0).__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

var __importStar = void 0 && (void 0).__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) {
    if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
  }
  result["default"] = mod;
  return result;
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var react_1 = __importDefault(require("react"));

var react_dom_1 = __importDefault(require("react-dom"));

var head_manager_1 = __importDefault(require("./head-manager"));

var router_1 = require("next/router");

var mitt_1 = __importDefault(require("next-server/dist/lib/mitt"));

var utils_1 = require("next-server/dist/lib/utils");

var page_loader_1 = __importDefault(require("./page-loader"));

var envConfig = __importStar(require("next-server/config"));

var error_boundary_1 = __importDefault(require("./error-boundary"));

var loadable_1 = __importDefault(require("next-server/dist/lib/loadable"));

var head_manager_context_1 = require("next-server/dist/lib/head-manager-context"); // Polyfill Promise globally
// This is needed because Webpack's dynamic loading(common chunks) code
// depends on Promise.
// So, we need to polyfill it.
// See: https://webpack.js.org/guides/code-splitting/#dynamic-imports


if (!window.Promise) {
  window.Promise = _promise.default;
}

var data = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
window.__NEXT_DATA__ = data;
var props = data.props,
    err = data.err,
    page = data.page,
    query = data.query,
    buildId = data.buildId,
    assetPrefix = data.assetPrefix,
    runtimeConfig = data.runtimeConfig,
    dynamicIds = data.dynamicIds;
var prefix = assetPrefix || ''; // With dynamic assetPrefix it's no longer possible to set assetPrefix at the build time
// So, this is how we do it in the client side at runtime

__webpack_public_path__ = "".concat(prefix, "/_next/"); //eslint-disable-line
// Initialize next/config with the environment configuration

envConfig.setConfig({
  serverRuntimeConfig: {},
  publicRuntimeConfig: runtimeConfig
});
var asPath = utils_1.getURL();
var pageLoader = new page_loader_1.default(buildId, prefix);

var register = function register(_ref) {
  var _ref2 = (0, _slicedToArray2.default)(_ref, 2),
      r = _ref2[0],
      f = _ref2[1];

  return pageLoader.registerPage(r, f);
};

if (window.__NEXT_P) {
  window.__NEXT_P.map(register);
}

window.__NEXT_P = [];
window.__NEXT_P.push = register;
var headManager = new head_manager_1.default();
var appContainer = document.getElementById('__next');
var lastAppProps;
var webpackHMR;
var Component;
var App;
exports.emitter = mitt_1.default();
exports.default =
/*#__PURE__*/
(0, _asyncToGenerator2.default)(
/*#__PURE__*/
_regenerator.default.mark(function _callee() {
  var _ref4,
      passedWebpackHMR,
      initialErr,
      _require,
      isValidElementType,
      _args = arguments;

  return _regenerator.default.wrap(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _ref4 = _args.length > 0 && _args[0] !== undefined ? _args[0] : {}, passedWebpackHMR = _ref4.webpackHMR;

          // This makes sure this specific line is removed in production
          if (process.env.NODE_ENV === 'development') {
            webpackHMR = passedWebpackHMR;
          }

          _context.next = 4;
          return pageLoader.loadPage('/_app');

        case 4:
          App = _context.sent;
          initialErr = err;
          _context.prev = 6;
          _context.next = 9;
          return pageLoader.loadPage(page);

        case 9:
          Component = _context.sent;

          if (!(process.env.NODE_ENV !== 'production')) {
            _context.next = 14;
            break;
          }

          _require = require('react-is'), isValidElementType = _require.isValidElementType;

          if (isValidElementType(Component)) {
            _context.next = 14;
            break;
          }

          throw new Error("The default export is not a React Component in page: \"".concat(page, "\""));

        case 14:
          _context.next = 19;
          break;

        case 16:
          _context.prev = 16;
          _context.t0 = _context["catch"](6);
          // This catches errors like throwing in the top level of a module
          initialErr = _context.t0;

        case 19:
          _context.next = 21;
          return loadable_1.default.preloadReady(dynamicIds || []);

        case 21:
          exports.router = router_1.createRouter(page, query, asPath, {
            initialProps: props,
            pageLoader: pageLoader,
            App: App,
            Component: Component,
            err: initialErr
          });
          exports.router.subscribe(function (_ref5) {
            var App = _ref5.App,
                Component = _ref5.Component,
                props = _ref5.props,
                err = _ref5.err;
            render({
              App: App,
              Component: Component,
              props: props,
              err: err,
              emitter: exports.emitter
            });
          });
          render({
            App: App,
            Component: Component,
            props: props,
            err: initialErr,
            emitter: exports.emitter
          });
          return _context.abrupt("return", exports.emitter);

        case 25:
        case "end":
          return _context.stop();
      }
    }
  }, _callee, null, [[6, 16]]);
}));

function render(_x) {
  return _render.apply(this, arguments);
}

function _render() {
  _render = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee2(props) {
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (!props.err) {
              _context2.next = 4;
              break;
            }

            _context2.next = 3;
            return renderError(props);

          case 3:
            return _context2.abrupt("return");

          case 4:
            _context2.prev = 4;
            _context2.next = 7;
            return doRender(props);

          case 7:
            _context2.next = 13;
            break;

          case 9:
            _context2.prev = 9;
            _context2.t0 = _context2["catch"](4);
            _context2.next = 13;
            return renderError((0, _assign.default)({}, props, {
              err: _context2.t0
            }));

          case 13:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, null, [[4, 9]]);
  }));
  return _render.apply(this, arguments);
}

exports.render = render; // This method handles all runtime and debug errors.
// 404 and 500 errors are special kind of errors
// and they are still handle via the main render method.

function renderError(_x2) {
  return _renderError.apply(this, arguments);
}

function _renderError() {
  _renderError = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee3(props) {
    var App, err, initProps;
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            App = props.App, err = props.err;

            if (!(process.env.NODE_ENV !== 'production')) {
              _context3.next = 3;
              break;
            }

            return _context3.abrupt("return", webpackHMR.reportRuntimeError(webpackHMR.prepareError(err)));

          case 3:
            // Make sure we log the error to the console, otherwise users can't track down issues.
            console.error(err);
            _context3.next = 6;
            return pageLoader.loadPage('/_error');

          case 6:
            exports.ErrorComponent = _context3.sent;

            if (!props.props) {
              _context3.next = 11;
              break;
            }

            _context3.t0 = props.props;
            _context3.next = 14;
            break;

          case 11:
            _context3.next = 13;
            return utils_1.loadGetInitialProps(App, {
              Component: exports.ErrorComponent,
              router: exports.router,
              ctx: {
                err: err,
                pathname: page,
                query: query,
                asPath: asPath
              }
            });

          case 13:
            _context3.t0 = _context3.sent;

          case 14:
            initProps = _context3.t0;
            _context3.next = 17;
            return doRender((0, _assign.default)({}, props, {
              err: err,
              Component: exports.ErrorComponent,
              props: initProps
            }));

          case 17:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _renderError.apply(this, arguments);
}

exports.renderError = renderError;
var isInitialRender = true;

function renderReactElement(reactEl, domEl) {
  // The check for `.hydrate` is there to support React alternatives like preact
  if (isInitialRender && typeof react_dom_1.default.hydrate === 'function') {
    react_dom_1.default.hydrate(reactEl, domEl);
    isInitialRender = false;
  } else {
    react_dom_1.default.render(reactEl, domEl);
  }
}

function doRender(_x3) {
  return _doRender.apply(this, arguments);
}

function _doRender() {
  _doRender = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee5(_ref6) {
    var App, Component, props, err, _ref6$emitter, emitterProp, _exports$router, pathname, _query, _asPath, appProps, onError;

    return _regenerator.default.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            App = _ref6.App, Component = _ref6.Component, props = _ref6.props, err = _ref6.err, _ref6$emitter = _ref6.emitter, emitterProp = _ref6$emitter === void 0 ? exports.emitter : _ref6$emitter;

            if (!(!props && Component && Component !== exports.ErrorComponent && lastAppProps.Component === exports.ErrorComponent)) {
              _context5.next = 6;
              break;
            }

            _exports$router = exports.router, pathname = _exports$router.pathname, _query = _exports$router.query, _asPath = _exports$router.asPath;
            _context5.next = 5;
            return utils_1.loadGetInitialProps(App, {
              Component: Component,
              router: exports.router,
              ctx: {
                err: err,
                pathname: pathname,
                query: _query,
                asPath: _asPath
              }
            });

          case 5:
            props = _context5.sent;

          case 6:
            Component = Component || lastAppProps.Component;
            props = props || lastAppProps.props;
            appProps = (0, _assign.default)({
              Component: Component,
              err: err,
              router: exports.router,
              headManager: headManager
            }, props); // lastAppProps has to be set before ReactDom.render to account for ReactDom throwing an error.

            lastAppProps = appProps;
            emitterProp.emit('before-reactdom-render', {
              Component: Component,
              ErrorComponent: exports.ErrorComponent,
              appProps: appProps
            }); // In development runtime errors are caught by react-error-overlay.

            if (process.env.NODE_ENV === 'development') {
              renderReactElement(react_1.default.createElement(head_manager_context_1.HeadManagerContext.Provider, {
                value: headManager.updateHead
              }, react_1.default.createElement(App, (0, _assign.default)({}, appProps))), appContainer);
            } else {
              // In production we catch runtime errors using componentDidCatch which will trigger renderError.
              onError =
              /*#__PURE__*/
              function () {
                var _ref7 = (0, _asyncToGenerator2.default)(
                /*#__PURE__*/
                _regenerator.default.mark(function _callee4(error) {
                  return _regenerator.default.wrap(function _callee4$(_context4) {
                    while (1) {
                      switch (_context4.prev = _context4.next) {
                        case 0:
                          _context4.prev = 0;
                          _context4.next = 3;
                          return renderError({
                            App: App,
                            err: error
                          });

                        case 3:
                          _context4.next = 8;
                          break;

                        case 5:
                          _context4.prev = 5;
                          _context4.t0 = _context4["catch"](0);
                          console.error('Error while rendering error page: ', _context4.t0);

                        case 8:
                        case "end":
                          return _context4.stop();
                      }
                    }
                  }, _callee4, null, [[0, 5]]);
                }));

                return function onError(_x4) {
                  return _ref7.apply(this, arguments);
                };
              }();

              renderReactElement(react_1.default.createElement(error_boundary_1.default, {
                onError: onError
              }, react_1.default.createElement(head_manager_context_1.HeadManagerContext.Provider, {
                value: headManager.updateHead
              }, react_1.default.createElement(App, (0, _assign.default)({}, appProps)))), appContainer);
            }

            emitterProp.emit('after-reactdom-render', {
              Component: Component,
              ErrorComponent: exports.ErrorComponent,
              appProps: appProps
            });

          case 13:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5);
  }));
  return _doRender.apply(this, arguments);
}