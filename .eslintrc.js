module.exports = {
  'extends': 'airbnb-base'
  ,'parserOptions': {
    ecmaVersion: 2018
    ,sourceType: 'script'
    ,ecmaFeatures: { impliedStrict: false }
  }
  ,'rules': {
    'strict': ['error' ,'global']
    // Var is disabled, and inner functions are fine in es6+
    ,'no-inner-declarations': ['off']
    , radix: ["error", "as-needed"]
    ,'max-len': [1 ,100 ,2 ,{ comments: 200 }]
    ,'brace-style': ['error' ,'stroustrup']
    ,'semi': ['error' ,'never']
    ,'semi-style': [ 'error', 'first']
    ,'comma-style': [
      'error'
      ,'first'
      ,{
        exceptions: {
          VariableDeclaration: false
          ,ArrayExpression: false
          ,ArrayPattern: false
          ,ObjectExpression: false
          ,ObjectPattern: false
          ,CallExpression: false
          ,FunctionDeclaration: false
          ,FunctionExpression: false
          ,NewExpression: false
          ,ArrowFunctionExpression: false
          ,ImportDeclaration: false
        }
      }
    ]
    ,'comma-spacing': [
      'error'
      ,{
        before: true ,after: false
      }
    ]
    ,'comma-dangle': ['error' ,'never']
    ,'object-curly-newline': [
      'error'
      ,{
        ObjectExpression: {
          multiline: true
          ,minProperties: 2
        }
        ,ObjectPattern: { multiline: true }
      }
    ]
    /* FIXME: elements should be required to either all be on the bracket line,
       or all one seperate lines.
       ALLOW:
       [1,2,3]
      [
        1,
        2,
        3,
      ]
      DISSALOW:
      [
        1,2,3
      ]
      [1
      ,2
      ,3]
    */
    ,'quote-props': ['error' ,'consistent-as-needed' ,{ keywords: true }]
    ,'func-names': ['error' ,'as-needed']
    ,'no-restricted-syntax': ['off' ,'ForOfStatement']
    ,'no-plusplus': ['off']
    ,'array-bracket-newline': [
      'error'
      ,{
        multiline: true
        ,minItems: null
      }
    ]
    ,'array-element-newline': ['error' ,{ multiline: true }]
  }
  ,'env': {
    browser: true
    ,node: false
    ,greasemonkey: true
  }
}
