// =============================================================================
//  Jenkinsfile  -  cardcapture_frontend  (React + TypeScript + Vite -> static)
// -----------------------------------------------------------------------------
//  Built from the same pipeline skeleton as the backend, but a frontend is a
//  STATIC build: there is no runtime process, no pm2, no DB migrations.
//
//    Backend (NestJS)               ->   Frontend (Vite SPA)
//    --------------------------------------------------------------------
//    npm run build -> dist/main.js  ->   vite build -> dist/ (static assets)
//    ship dist + node_modules       ->   ship ONLY dist/ (static files)
//    pm2 start/reload               ->   copy to web root + reload Apache (httpd)
//    artisan/sql migrations         ->   none
//    runtime shared .env            ->   build-time .env (VITE_* baked into bundle)
//
//  IMPORTANT NOTES
//    - VITE_* variables are compiled INTO the bundle at build time, so the
//      correct .env must be present BEFORE `vite build`. This pipeline injects
//      it from an optional per-env Jenkins "Secret file" credential
//      `frontend-env-<env>` (uat/dev/prd). If absent, it builds with the
//      in-repo defaults (vite.config.ts `define` + code fallbacks).
//    - package.json's `copy-htaccess` uses the Windows `copy` command and will
//      fail on a Linux agent, so this pipeline runs the build steps directly
//      and copies .htaccess with `cp`. (Recommend making that npm script
//      cross-platform so local == CI.)
//    - .htaccess contains SPA rewrite rules; the Apache vhost serving the web
//      root must have `AllowOverride All` for them to take effect.
//
//  REQUIREMENTS
//    - Jenkins agent: Node.js 20.x + npm on PATH (or configure the NodeJS plugin).
//    - Target server: Apache (httpd) serving the web root; sudo for reload.
//    - Jenkins credentials (lowercase <env> = uat/dev/prd):
//          deploy-path-<env>      (Secret text)  base deploy path
//          deploy-login-<env>     (Username/pwd) SSH user + password
//          <env>-server-ip        (Secret text)  target host / IP
//          frontend-env-<env>     (Secret file)  OPTIONAL build-time .env
// =============================================================================

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

        // ---------------------------------------------------------------------
        //  Build-time environment (VITE_* get baked into the bundle here)
        // ---------------------------------------------------------------------
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
            // Non-blocking by default; drop the "|| true" to gate the build on lint.
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

        // ---------------------------------------------------------------------
        //  Package ONLY the static build output (dist/ contents, incl. dotfiles)
        // ---------------------------------------------------------------------
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

        // ---------------------------------------------------------------------
        //  Deployments
        // ---------------------------------------------------------------------
        stage('Deploy To UAT') {
            when {
                expression { params.ONLY_BUILD_ARTIFACT == false }
                expression { params.ENVIRONMENT == 'UAT' }
            }
            steps {
                script { deployFrontend() }
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

// =============================================================================
//  Shared deploy routine (used by UAT and PRD).
//  Uploads the static tarball, extracts it into a timestamped release, repoints
//  the Apache web-root symlink, fixes ownership, and reloads httpd.
// =============================================================================
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

            sudo chown -R apache:apache \$RELEASE_DIR
            sudo chmod -R 755 \$RELEASE_DIR

            # Keep only the 3 most recent releases
            ls -1dt ${env.REMOTE_PATH}/releases/*/ | tail -n +4 | xargs rm -rf || true

            # Reload Apache to pick up the new document root (no downtime)
            sudo systemctl reload httpd

            echo "Deployment SUCCESS (release ${env.RELEASE})"
        """
    }
}
