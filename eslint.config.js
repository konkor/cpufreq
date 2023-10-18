import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ARGV: 'readonly',
                Debugger: 'readonly',
                GIRepositoryGType: 'readonly',
                globalThis: 'readonly',
                imports: 'readonly',
                Intl: 'readonly',
                log: 'readonly',
                logError: 'readonly',
                pkg: 'readonly',
                print: 'readonly',
                printerr: 'readonly',
                window: 'readonly',
                TextEncoder: 'readonly',
                TextDecoder: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
            },
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
        },
        rules: {
            // See: https://eslint.org/docs/latest/rules/#possible-problems
            'array-callback-return': 'error',
            'no-await-in-loop': 'error',
            'no-constant-binary-expression': 'error',
            'no-constructor-return': 'error',
            'no-new-native-nonconstructor': 'error',
            'no-promise-executor-return': 'error',
            'no-self-compare': 'error',
            'no-template-curly-in-string': 'error',
            'no-unmodified-loop-condition': 'error',
            'no-unreachable-loop': 'error',
            'no-unused-private-class-members': 'error',
            'no-use-before-define': [
                'error',
                {
                    functions: false,
                    classes: true,
                    variables: true,
                    allowNamedExports: true,
                },
            ],
            // See: https://eslint.org/docs/latest/rules/#suggestions
            'block-scoped-var': 'error',
            'complexity': 'warn',
            'consistent-return': 'error',
            'default-param-last': 'error',
            'eqeqeq': 'error',
            'no-array-constructor': 'error',
            'no-caller': 'error',
            'no-extend-native': 'error',
            'no-extra-bind': 'error',
            'no-extra-label': 'error',
            'no-iterator': 'error',
            'no-label-var': 'error',
            'no-loop-func': 'error',
            'no-multi-assign': 'warn',
            'no-new-object': 'error',
            'no-new-wrappers': 'error',
            'no-proto': 'error',
            'no-shadow': 'warn',
            'no-unused-vars': [
                'error',
                {
                    varsIgnorePattern: '^_',
                    argsIgnorePattern: '^_',
                },
            ],
            'no-var': 'warn',
            'unicode-bom': 'error',
            // GJS Restrictions
            'no-restricted-globals': [
                'error',
                {
                    name: 'Debugger',
                    message: 'Internal use only',
                },
                {
                    name: 'GIRepositoryGType',
                    message: 'Internal use only',
                },
                {
                    name: 'log',
                    message: 'Use console.log()',
                },
                {
                    name: 'logError',
                    message: 'Use console.warn() or console.error()',
                },
            ],
            'no-restricted-properties': [
                'error',
                {
                    object: 'imports',
                    property: 'format',
                    message: 'Use template strings',
                },
                {
                    object: 'pkg',
                    property: 'initFormat',
                    message: 'Use template strings',
                },
                {
                    object: 'Lang',
                    property: 'copyProperties',
                    message: 'Use Object.assign()',
                },
                {
                    object: 'Lang',
                    property: 'bind',
                    message: 'Use arrow notation or Function.prototype.bind()',
                },
                {
                    object: 'Lang',
                    property: 'Class',
                    message: 'Use ES6 classes',
                },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'MethodDefinition[key.name="_init"] CallExpression[arguments.length<=1][callee.object.type="Super"][callee.property.name="_init"]',
                    message: 'Use constructor() and super()',
                },
            ],
        },
    },
];