*** Settings ***
Documentation     Live FaceTag API acceptance tests against the deployed Vercel preview.
Resource          ../resources/common.resource
Suite Setup       Create API Session    live    ${LIVE_API}

*** Test Cases ***
Health Endpoint Is Healthy
    ${body}=    GET JSON    live    /api/health    expected=200
    Should Be Equal    ${body}[status]    ok
    Should Contain Any    ${body}[auth]    better-auth    clerk
    Should Contain    ${body}[database]    connected
    Dictionary Should Contain Key    ${body}    faceService
    Dictionary Should Contain Key    ${body}    runtime

Protected Me Route Requires Auth
    ${response}=    GET On Session    live    /api/users/me    expected_status=any
    Status Should Be    ${response}    401
    ${body}=    Json Body    ${response}
    Should Contain    ${body}[error]    Unauthorized

Protected Profile Update Requires Auth
    ${payload}=    Create Dictionary    fullName=Robot
    ${response}=    PUT On Session    live    /api/users/profile    json=${payload}    expected_status=any
    Status Should Be    ${response}    401

Protected Enroll Requires Auth
    ${payload}=    Create Dictionary    imageBase64=ZmFrZQ==
    ${response}=    POST On Session    live    /api/users/enroll-face    json=${payload}    expected_status=any
    Status Should Be    ${response}    401

Protected Scan Requires Auth
    ${payload}=    Create Dictionary    imageBase64=ZmFrZQ==
    ${response}=    POST On Session    live    /api/scan/match    json=${payload}    expected_status=any
    Status Should Be    ${response}    401

Protected Username Check Requires Auth
    ${response}=    GET On Session    live    /api/users/check-username    params=username=robotuser    expected_status=any
    # 401 when the dedicated route is hit; some deployments may 404 via the [username] catch-all.
    Should Be True    ${response.status_code} in [401, 404]

Unknown Public Profile Returns 404
    ${response}=    GET On Session    live    /api/users/definitely-not-a-real-user-xyz    expected_status=any
    Status Should Be    ${response}    404
    ${body}=    Json Body    ${response}
    Should Contain    ${body}[error]    not found

Health Accepts GET
    ${body}=    GET JSON    live    /api/health
    Should Be Equal    ${body}[status]    ok
