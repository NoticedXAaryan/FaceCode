*** Settings ***
Library           Collections
Library           OperatingSystem
Library           Process
Library           String
Library           RequestsLibrary
Library           ../libraries/FaceTagLogic.py

*** Variables ***
${LIVE_API}             %{LIVE_API=https://face-code-pink.vercel.app}
${MOCK_API}             http://127.0.0.1:8787
${MOCK_PORT}            8787
${WEB_PORT}             8765
${WEB_ROOT}             ${EMPTY}
${RESULTS_DIR}          ${CURDIR}${/}..${/}..${/}results
${REPO_ROOT}            ${CURDIR}${/}..${/}..

*** Keywords ***
Repo Path
    [Arguments]    ${relative}=${EMPTY}
    ${root}=    Project Root
    IF    '${relative}' == ''
        RETURN    ${root}
    END
    RETURN    ${root}${/}${relative}

Ensure Results Dir
    Create Directory    ${RESULTS_DIR}

Json Body
    [Arguments]    ${response}
    ${body}=    Set Variable    ${response.json()}
    RETURN    ${body}

Status Should Be
    [Arguments]    ${response}    ${expected}
    Should Be Equal As Integers    ${response.status_code}    ${expected}

Bearer For
    [Arguments]    ${user_id}
    RETURN    test-${user_id}

Auth Headers
    [Arguments]    ${user_id}
    ${token}=    Bearer For    ${user_id}
    ${headers}=    Create Dictionary    Authorization=Bearer ${token}    Content-Type=application/json
    RETURN    ${headers}

Create API Session
    [Arguments]    ${alias}    ${base_url}
    Create Session    ${alias}    ${base_url}    disable_warnings=1

GET JSON
    [Arguments]    ${alias}    ${path}    ${headers}=${NONE}    ${expected}=200
    ${response}=    GET On Session    ${alias}    ${path}    headers=${headers}    expected_status=any
    Status Should Be    ${response}    ${expected}
    ${body}=    Json Body    ${response}
    RETURN    ${body}

POST JSON
    [Arguments]    ${alias}    ${path}    ${payload}    ${headers}=${NONE}    ${expected}=200
    ${response}=    POST On Session    ${alias}    ${path}    json=${payload}    headers=${headers}    expected_status=any
    Status Should Be    ${response}    ${expected}
    ${body}=    Json Body    ${response}
    RETURN    ${body}

PUT JSON
    [Arguments]    ${alias}    ${path}    ${payload}    ${headers}=${NONE}    ${expected}=200
    ${response}=    PUT On Session    ${alias}    ${path}    json=${payload}    headers=${headers}    expected_status=any
    Status Should Be    ${response}    ${expected}
    ${body}=    Json Body    ${response}
    RETURN    ${body}

DELETE JSON
    [Arguments]    ${alias}    ${path}    ${headers}=${NONE}    ${expected}=200
    ${response}=    DELETE On Session    ${alias}    ${path}    headers=${headers}    expected_status=any
    Status Should Be    ${response}    ${expected}
    ${body}=    Json Body    ${response}
    RETURN    ${body}

Start Mock API
    ${root}=    Project Root
    ${cmd}=    Set Variable    node "${root}/robot/tools/mock_api.mjs"
    ${handle}=    Start Process    node    ${root}/robot/tools/mock_api.mjs
    ...    shell=False
    ...    stdout=${RESULTS_DIR}${/}mock_api.out
    ...    stderr=${RESULTS_DIR}${/}mock_api.err
    ...    alias=mock_api
    Set Suite Variable    ${MOCK_PROCESS}    ${handle}
    Wait Until Keyword Succeeds    20x    0.25s    Mock API Is Up
    RETURN    ${handle}

Mock API Is Up
    Create Session    mock_probe    ${MOCK_API}    disable_warnings=1
    ${response}=    GET On Session    mock_probe    /api/health    expected_status=any
    Should Be Equal As Integers    ${response.status_code}    200

Stop Mock API
    ${running}=    Run Keyword And Return Status    Process Should Be Running    handle=${MOCK_PROCESS}
    IF    ${running}
        Terminate Process    handle=${MOCK_PROCESS}    kill=True
    END

Resolve Web Root
    ${root}=    Project Root
    ${dist}=    Set Variable    ${root}${/}dist
    ${tmp}=    Set Variable    /tmp/facetag-dist
    ${has_dist}=    Run Keyword And Return Status    Directory Should Exist    ${dist}${/}_expo
    IF    ${has_dist}
        Set Suite Variable    ${WEB_ROOT}    ${dist}
        RETURN    ${dist}
    END
    ${has_tmp}=    Run Keyword And Return Status    Directory Should Exist    ${tmp}${/}_expo
    IF    ${has_tmp}
        Set Suite Variable    ${WEB_ROOT}    ${tmp}
        RETURN    ${tmp}
    END
    Fail    No web export found. Run npm run export:web first.

Start Static Web Server
    ${web_root}=    Resolve Web Root
    ${root}=    Project Root
    ${handle}=    Start Process    python3    ${root}/robot/tools/spa_server.py    ${WEB_PORT}    ${web_root}
    ...    stdout=${RESULTS_DIR}${/}web_server.out
    ...    stderr=${RESULTS_DIR}${/}web_server.err
    ...    alias=web_server
    Set Suite Variable    ${WEB_PROCESS}    ${handle}
    Wait Until Keyword Succeeds    20x    0.25s    Web Server Is Up
    RETURN    ${handle}

Web Server Is Up
    Create Session    web_probe    http://127.0.0.1:${WEB_PORT}    disable_warnings=1
    ${response}=    GET On Session    web_probe    /    expected_status=any
    Should Be Equal As Integers    ${response.status_code}    200

Stop Static Web Server
    ${running}=    Run Keyword And Return Status    Process Should Be Running    handle=${WEB_PROCESS}
    IF    ${running}
        Terminate Process    handle=${WEB_PROCESS}    kill=True
    END
