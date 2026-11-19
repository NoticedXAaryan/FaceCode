*** Settings ***
Documentation     Full authenticated FaceTag API flows against the in-memory mock server.
Resource          ../resources/common.resource
Suite Setup       Setup Mock Suite
Suite Teardown    Teardown Mock Suite

*** Keywords ***
Setup Mock Suite
    Ensure Results Dir
    Start Mock API
    Create API Session    mock    ${MOCK_API}
    Reset Mock API State

Teardown Mock Suite
    Stop Mock API

Reset Mock API State
    ${empty}=    Create Dictionary
    ${response}=    POST On Session    mock    /__robot__/reset    json=${empty}    expected_status=any
    Status Should Be    ${response}    200

*** Test Cases ***
Mock Health Reports Memory Runtime
    ${body}=    GET JSON    mock    /api/health
    Should Be Equal    ${body}[status]    ok
    Should Be Equal    ${body}[database]    memory
    Should Be Equal    ${body}[auth]    mock-bearer

Unauthorized Requests Are Rejected
    ${response}=    GET On Session    mock    /api/users/me    expected_status=any
    Status Should Be    ${response}    401

New User Starts Without Face Or Profile
    Reset Mock API State
    ${headers}=    Auth Headers    alice
    ${body}=    GET JSON    mock    /api/users/me    headers=${headers}
    Should Be Equal As Strings    ${body}[hasFace]    False
    Should Be Equal As Strings    ${body}[hasProfile]    False
    Should Be Equal    ${body}[username]    ${None}

Username Availability Works
    Reset Mock API State
    ${alice}=    Auth Headers    alice
    ${bob}=    Auth Headers    bob
    ${available}=    GET JSON    mock    /api/users/check-username?username=ava_stone    headers=${alice}
    Should Be Equal As Strings    ${available}[available]    True
    ${payload}=    Create Dictionary    fullName=Ava Stone    username=ava_stone    isPublic=${True}
    PUT JSON    mock    /api/users/profile    ${payload}    headers=${alice}
    ${taken}=    GET JSON    mock    /api/users/check-username?username=ava_stone    headers=${bob}
    Should Be Equal As Strings    ${taken}[available]    False
    Should Be Equal    ${taken}[reason]    taken
    ${invalid}=    GET JSON    mock    /api/users/check-username?username=ab    headers=${alice}
    Should Be Equal As Strings    ${invalid}[available]    False
    Should Be Equal    ${invalid}[reason]    invalid

Profile Save And Public Lookup
    Reset Mock API State
    ${alice}=    Auth Headers    alice
    ${links}=    Create List
    ${link}=    Create Dictionary    platform=instagram    url=instagram.com/ava
    Append To List    ${links}    ${link}
    ${payload}=    Create Dictionary    fullName=Ava Stone    username=ava_stone    bio=hello    isPublic=${True}    links=${links}
    ${saved}=    PUT JSON    mock    /api/users/profile    ${payload}    headers=${alice}
    Should Be Equal As Strings    ${saved}[success]    True
    Should Be Equal    ${saved}[username]    ava_stone
    ${me}=    GET JSON    mock    /api/users/me    headers=${alice}
    Should Be Equal As Strings    ${me}[hasProfile]    True
    ${public}=    GET JSON    mock    /api/users/ava_stone
    Should Be Equal    ${public}[user][username]    ava_stone
    Should Be Equal    ${public}[links][0][url]    https://instagram.com/ava

Enroll Face Then Match From Another User
    Reset Mock API State
    ${alice}=    Auth Headers    alice
    ${bob}=    Auth Headers    bob
    ${profile}=    Create Dictionary    fullName=Ava Stone    username=ava_stone    isPublic=${True}
    PUT JSON    mock    /api/users/profile    ${profile}    headers=${alice}
    ${face_a}=    Create Dictionary    imageBase64=face-image-alice-001
    ${enrolled}=    POST JSON    mock    /api/users/enroll-face    ${face_a}    headers=${alice}
    Should Be Equal As Strings    ${enrolled}[success]    True
    ${me}=    GET JSON    mock    /api/users/me    headers=${alice}
    Should Be Equal As Strings    ${me}[hasFace]    True
    ${scan}=    Create Dictionary    imageBase64=face-image-alice-001
    ${match}=    POST JSON    mock    /api/scan/match    ${scan}    headers=${bob}
    Should Be Equal As Strings    ${match}[matched]    True
    Should Be Equal    ${match}[user][username]    ava_stone
    ${miss}=    Create Dictionary    imageBase64=face-image-other-999
    ${nomatch}=    POST JSON    mock    /api/scan/match    ${miss}    headers=${bob}
    Should Be Equal As Strings    ${nomatch}[matched]    False

Private Profiles Do Not Match Publicly
    Reset Mock API State
    ${alice}=    Auth Headers    alice
    ${bob}=    Auth Headers    bob
    ${profile}=    Create Dictionary    fullName=Hidden    username=hidden_user    isPublic=${False}
    PUT JSON    mock    /api/users/profile    ${profile}    headers=${alice}
    ${face}=    Create Dictionary    imageBase64=private-face-42
    POST JSON    mock    /api/users/enroll-face    ${face}    headers=${alice}
    ${scan}=    Create Dictionary    imageBase64=private-face-42
    ${match}=    POST JSON    mock    /api/scan/match    ${scan}    headers=${bob}
    Should Be Equal As Strings    ${match}[matched]    False
    Should Contain    ${match}[message]    private
    ${response}=    GET On Session    mock    /api/users/hidden_user    expected_status=any
    Status Should Be    ${response}    404

Delete Face Clears Enrollment
    Reset Mock API State
    ${alice}=    Auth Headers    alice
    ${face}=    Create Dictionary    imageBase64=delete-me-face
    POST JSON    mock    /api/users/enroll-face    ${face}    headers=${alice}
    DELETE JSON    mock    /api/users/face    headers=${alice}
    ${me}=    GET JSON    mock    /api/users/me    headers=${alice}
    Should Be Equal As Strings    ${me}[hasFace]    False

Enroll Without Image Returns 400
    Reset Mock API State
    ${alice}=    Auth Headers    alice
    ${empty}=    Create Dictionary
    ${response}=    POST On Session    mock    /api/users/enroll-face    json=${empty}    headers=${alice}    expected_status=any
    Status Should Be    ${response}    400
