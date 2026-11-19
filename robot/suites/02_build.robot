*** Settings ***
Documentation     Build and quality smoke checks driven by Robot Framework Process library.
Resource          ../resources/common.resource
Force Tags        build
Suite Setup       Ensure Results Dir

*** Test Cases ***
Npm Unit Tests Pass
    ${root}=    Project Root
    ${result}=    Run Process    npm    test    cwd=${root}    stdout=${RESULTS_DIR}${/}npm_test.out    stderr=${RESULTS_DIR}${/}npm_test.err
    Should Be Equal As Integers    ${result.rc}    0

Typecheck Passes
    ${root}=    Project Root
    ${result}=    Run Process    npm    run    typecheck    cwd=${root}    stdout=${RESULTS_DIR}${/}typecheck.out    stderr=${RESULTS_DIR}${/}typecheck.err
    Should Be Equal As Integers    ${result.rc}    0

Lint Passes
    ${root}=    Project Root
    ${result}=    Run Process    npm    run    lint    cwd=${root}    stdout=${RESULTS_DIR}${/}lint.out    stderr=${RESULTS_DIR}${/}lint.err
    Should Be Equal As Integers    ${result.rc}    0

Package Manifest Declares Required Scripts
    ${root}=    Project Root
    ${pkg}=    Get File    ${root}${/}package.json
    Should Contain    ${pkg}    "test"
    Should Contain    ${pkg}    "typecheck"
    Should Contain    ${pkg}    "lint"
    Should Contain    ${pkg}    "export:web"
    Should Contain    ${pkg}    "test:robot"
