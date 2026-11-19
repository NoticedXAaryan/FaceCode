*** Settings ***
Documentation     FaceTag domain logic via Robot Framework wrapping Node modules.
Resource          ../resources/common.resource
Library           Collections

*** Test Cases ***
Usernames Are Normalized And Validated
    ${normalized}=    Normalize Username    Hi There!
    Should Be Equal    ${normalized}    hithere
    Username Should Be Valid    good_name
    Username Should Be Invalid    ab
    Username Should Be Invalid    !!

Partial Profile Merge Keeps Unsent Fields
    ${existing}=    Create Dictionary
    ...    email=a@b.co
    ...    full_name=Ava Stone
    ...    username=ava
    ...    bio=hello
    ...    is_public=${True}
    ...    primary_link_platform=instagram
    ...    avatar_url=https://cdn.example/a.jpg
    ${patch}=    Create Dictionary    isPublic=${False}
    ${merged}=    Merge Profile    ${existing}    ${patch}    a@b.co
    Should Be Equal    ${merged}[profile][username]    ava
    Should Be Equal    ${merged}[profile][full_name]    Ava Stone
    Should Be Equal As Strings    ${merged}[profile][is_public]    False
    Should Be Equal    ${merged}[links]    ${None}

Username And Links Are Normalized On Create
    ${link}=    Create Dictionary    platform=Instagram    url=instagram.com/ava
    ${empty_link}=    Create Dictionary    platform=website    url=${EMPTY}
    ${links}=    Create List    ${link}    ${empty_link}
    ${patch}=    Create Dictionary    fullName=${SPACE}${SPACE}Ava Stone${SPACE}    username=Ava Stone!    links=${links}
    ${merged}=    Merge Profile    ${None}    ${patch}    ava@facetag.app
    Should Be Equal    ${merged}[profile][username]    avastone
    Should Be Equal    ${merged}[profile][full_name]    Ava Stone
    ${completed}=    Profile Completion    ${merged}[profile]
    Should Be True    ${completed}
    Length Should Be    ${merged}[links]    1
    Should Be Equal    ${merged}[links][0][url]    https://instagram.com/ava

Onboarding Routes Follow Face Then Profile
    ${enroll}=    Onboarding Route For    false    false
    Should Be Equal    ${enroll}    /enroll
    ${setup}=    Onboarding Route For    true    false
    Should Be Equal    ${setup}    /setup
    ${scanner}=    Onboarding Route For    true    true
    Should Be Equal    ${scanner}    /(tabs)/scanner

Blank Frames Are Not Faces
    ${analysis}=    Analyze Synthetic Face    blank
    Should Be Equal As Strings    ${analysis}[hasFace]    False

Checkerboard Images Are Not Faces
    ${analysis}=    Analyze Synthetic Face    checker
    Should Be Equal As Strings    ${analysis}[hasFace]    False

Same Face Matches And Different Face Does Not
    ${analysis}=    Analyze Synthetic Face    face
    Should Be Equal As Strings    ${analysis}[hasFace]    True
    ${same_ok}=    Evaluate    float(${analysis}[sameScore]) >= float(${analysis}[threshold])
    ${other_ok}=    Evaluate    float(${analysis}[otherScore]) < float(${analysis}[threshold])
    Should Be True    ${same_ok}
    Should Be True    ${other_ok}
    Should Be True    ${analysis}[dims] > 0

Node Unit Tests Still Pass Under Robot
    Run Node Test File    tests/facePixels.test.js
    Run Node Test File    tests/profile.test.js
