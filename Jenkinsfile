pipeline {
    agent any

    // tools {
    //     nodejs 'Node20'
    // }

    triggers {
        githubPush()
    }

    parameters {
        choice(name: 'ENVIRONMENT', choices: ['UAT', 'DEV', 'PRD'])
        string(name: 'CR_NUMBER', defaultValue: '', description: 'Enter the CR number for this deployment')
        booleanParam(name: 'ONLY_BUILD_ARTIFACT', defaultValue: false)
    }

    environment {
        RELEASE  = "${env.BUILD_NUMBER}"
        PORTAL   = "cardcapturetst"
        APP_NAME = "cardcapture_frontend"
        CI       = "true"
    }

    stages {
        stage('Validate Parameters') {
            when {
                expression { params.ENVIRONMENT == 'PRD' }
            }
            steps {
                script {
                    if (!params.CR_NUMBER || params.CR_NUMBER.trim() == "") {
                        error "Pipeline aborted: The parameter 'CR_NUMBER' cannot be empty!"
                    }
                    currentBuild.displayName = "#${env.BUILD_NUMBER} - ${params.CR_NUMBER}"
                }
            }
        }

        stage('Clean Workspace') {
            steps {
                deleteDir()
            }
        }

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Create Environment') {
            steps {
                script {
                    def envName = (params.ENVIRONMENT ?: 'UAT').toLowerCase()

                    withCredentials([string(credentialsId: "deploy-path-${envName}", variable: 'REMOTE_PATH')]) {
                        env.REMOTE_PATH = "${REMOTE_PATH}/${env.PORTAL}/${env.APP_NAME}"
                    }

                    env.ENVIRONMENT = envName
                    env.SSH_KEY     = "${env.ENVIRONMENT}-ssh-key"
                }
            }
        }

        stage('Prepare Build Env') {
            steps {
                script {
                    try {
                        withCredentials([file(credentialsId: "frontend-env-${env.ENVIRONMENT}", variable: 'ENV_FILE')]) {
                            sh 'cp -f "$ENV_FILE" .env'
                            echo "Loaded build-time .env for ${env.ENVIRONMENT}"
                        }
                    } catch (err) {
                        echo "No 'frontend-env-${env.ENVIRONMENT}' credential found; building with in-repo defaults."
                    }
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    set -euo pipefail
                    node --version
                    npm --version
                    npm ci
                '''
            }
        }

        stage('Lint') {
            
            steps {
                sh '''
                    set -uo pipefail
                    npm run lint || true
                '''
            }
        }

        stage('Build Application') {
            steps {
                sh '''
                    set -euo pipefail

                    # package.json "build" = tsc -b && vite build && copy-htaccess(Windows-only).
                    # Run the build steps directly so this works on a Linux agent:
                    npx tsc -b
                    npx vite build

                    # Cross-platform replacement for the Windows-only "copy-htaccess" script:
                    cp -f src/assets/.htaccess dist/.htaccess

                    test -f dist/index.html
                    test -f dist/.htaccess
                '''
            }
        }

        stage('Create Artifact') {
            steps {
                sh """
                    set -euo pipefail

                    rm -f ${env.RELEASE}.tar.gz

                    # -C dist . includes .htaccess (dotfiles) at the archive root
                    tar -czf ${env.RELEASE}.tar.gz -C dist .

                    test -f ${env.RELEASE}.tar.gz
                    tar -tzf ${env.RELEASE}.tar.gz | grep -q './index.html'
                    ls -lh ${env.RELEASE}.tar.gz
                """
            }
        }

        stage('Archive Artifact') {
            steps {
                archiveArtifacts(
                    artifacts: "${env.RELEASE}.tar.gz",
                    fingerprint: true,
                    onlyIfSuccessful: true
                )
            }
        }

        stage('Deploy To UAT') {
            when {
                expression { params.ONLY_BUILD_ARTIFACT == false }
                expression { params.ENVIRONMENT == 'UAT' }
            }
            steps {
                // UAT is a placeholder (same as the other apps' pipelines): the
                // build + artifact are produced, but no SSH deploy runs here, so
                // NO deploy-login-uat / uat-server-ip credentials are required.
                sh """
                    set -e
                    echo "UAT build complete (no automated deploy)."
                    echo "Release: ${env.RELEASE}"
                    echo "Environment: ${env.ENVIRONMENT}"
                    echo "Remote Path: ${env.REMOTE_PATH}"
                """
                // To enable a real UAT deploy later: create the Jenkins credentials
                // deploy-login-uat (username/password) + uat-server-ip (secret text),
                // then replace the echo block above with:
                //   script { deployFrontend() }
            }
        }

        stage('Deploy To DEV') {
            when {
                expression { params.ONLY_BUILD_ARTIFACT == false }
                expression { params.ENVIRONMENT == 'DEV' }
            }
            steps {
                sh "echo Deploying to development"
            }
        }

        stage('Deploy To PRD') {
            when {
                expression { params.ONLY_BUILD_ARTIFACT == false }
                expression { params.ENVIRONMENT == 'PRD' }
            }
            steps {
                script { deployFrontend() }
            }
        }
    }

    post {
        success {
            echo "cardcapture_frontend deployed successfully (env: ${env.ENVIRONMENT})"
        }
        failure {
            echo "Build failed - check npm ci / tsc / vite build errors above"
        }
        always {
            echo "Pipeline completed"
        }
    }
}

def deployFrontend() {
    withCredentials([
        usernamePassword(credentialsId: "deploy-login-${env.ENVIRONMENT}",
                         passwordVariable: 'SSH_PASS',
                         usernameVariable: 'SSH_USER'),
        string(credentialsId: "${env.ENVIRONMENT}-server-ip", variable: 'REMOTE_HOST')
    ]) {
        def remote = [:]
        remote.name          = "${env.ENVIRONMENT}-server"
        remote.host          = REMOTE_HOST
        remote.user          = SSH_USER
        remote.password      = SSH_PASS
        remote.allowAnyHosts = true

        echo "Preparing remote directories on ${env.ENVIRONMENT}..."
        sshCommand remote: remote, command: """
            set -e
            mkdir -p ${env.REMOTE_PATH}/releases
            sudo mkdir -p /var/www/html/${env.PORTAL}
        """

        echo "Uploading artifact ${env.RELEASE}.tar.gz..."
        sshPut remote: remote, from: "${env.RELEASE}.tar.gz", into: "${env.REMOTE_PATH}"

        echo "Publishing release ${env.RELEASE}..."
        sshCommand remote: remote, command: """
            set -e
            RELEASE_DIR=${env.REMOTE_PATH}/releases/${env.RELEASE}
            mkdir -p \$RELEASE_DIR

            # Extract the static site (index.html, assets/, .htaccess) into the release
            tar -xzf ${env.REMOTE_PATH}/${env.RELEASE}.tar.gz -C \$RELEASE_DIR
            rm -f ${env.REMOTE_PATH}/${env.RELEASE}.tar.gz

            # Serve it: Apache serves this web-root symlink (vhost needs AllowOverride All)
            sudo ln -sfn \$RELEASE_DIR /var/www/html/${env.PORTAL}/${env.APP_NAME}

            sudo chmod -R 755 \$RELEASE_DIR

            # Keep only the 3 most recent releases
            ls -1dt ${env.REMOTE_PATH}/releases/*/ | tail -n +4 | xargs rm -rf || true

            echo "Deployment SUCCESS (release ${env.RELEASE})"
        """
    }
}
