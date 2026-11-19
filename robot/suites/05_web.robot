*** Settings ***
Documentation     Web export smoke tests with SeleniumLibrary against the static SPA.
Resource          ../resources/common.resource
Library           SeleniumLibrary    run_on_failure=Capture Page Screenshot
Suite Setup       Setup Web Suite
Suite Teardown    Teardown Web Suite

*** Variables ***
${BROWSER}        headlesschrome
${WEB_URL}        http://127.0.0.1:${WEB_PORT}

*** Keywords ***
Setup Web Suite
    Ensure Results Dir
    Start Static Web Server
    ${options}=    Evaluate
    ...    (lambda o: (o.add_argument('--headless=new'), o.add_argument('--no-sandbox'), o.add_argument('--disable-dev-shm-usage'), o.add_argument('--window-size=1280,900'), o)[-1])(__import__('selenium.webdriver', fromlist=['ChromeOptions']).ChromeOptions())
    Open Browser    ${WEB_URL}    ${BROWSER}    options=${options}
    Set Selenium Timeout    20 seconds

Teardown Web Suite
    Run Keyword And Ignore Error    Close All Browsers
    Stop Static Web Server

*** Test Cases ***
Index Document Loads FaceTag Shell
    Create Session    web    ${WEB_URL}    disable_warnings=1
    ${response}=    GET On Session    web    /    expected_status=200
    Should Contain    ${response.text}    FaceTag
    Should Contain    ${response.text}    <div id="root"></div>
    Should Contain    ${response.text}    /_expo/static/js/web/

App Boots With FaceTag Branding
    Go To    ${WEB_URL}/
    Wait Until Page Contains    FaceTag    timeout=25s
    ${title}=    Get Title
    Should Be Equal    ${title}    FaceTag

Legal Route Still Boots The SPA
    Go To    ${WEB_URL}/legal
    Wait Until Page Contains    FaceTag    timeout=25s
    ${title}=    Get Title
    Should Be Equal    ${title}    FaceTag

Static Asset Bundle Is Served
    Create Session    webassets    ${WEB_URL}    disable_warnings=1
    ${index}=    GET On Session    webassets    /    expected_status=200
    ${match}=    Get Regexp Matches    ${index.text}    /_expo/static/js/web/[^"]+\\.js
    Length Should Be    ${match}    1
    ${asset}=    Set Variable    ${match}[0]
    ${js}=    GET On Session    webassets    ${asset}    expected_status=200
    Should Contain    ${js.text}    FaceTag
