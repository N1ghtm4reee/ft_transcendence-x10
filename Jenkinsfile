pipeline {
    agent any

    environment {
        registry = "n1ghtm4r3e"              // DockerHub username
        registryCredential = "DOCKERHUB_LOGIN" // Jenkins credential ID
        commitHash = "${env.GIT_COMMIT[0..6]}" // short commit hash for tagging
    }

    stages {

        stage('Checkout Source') {
            steps {
                git branch: 'main', url: 'https://github.com/N1ghtm4reee/ft_transcendence-x10.git'
                sh 'ls -la'
            }
        }

        stage('Build Images') {
            steps {
                echo "Building backend images..."
                script {
                    def composeCmd = "docker compose"
                    try {
                        sh "${composeCmd} version"
                    } catch (e) {
                        composeCmd = "docker-compose"
                    }

                    sh "${composeCmd} -f docker-compose.backend.yml build --no-cache"
                }
                sh 'docker images | grep -E "(api-gateway|auth-service|user-service)" || echo "No matching images found"'
            }
        }

        stage('Tag Images') {
            steps {
                echo "Tagging images with DockerHub namespace..."
                script {
                    def services = [
                        "api-gateway" : "trandandan_api-gateway",
                        "auth-service": "trandandan_auth-service",
                        "user-service": "trandandan_user-service"
                    ]

                    services.each { localName, remoteName ->
                        sh """
                            if docker images ${localName}:latest --format '{{.Repository}}' | grep -q ${localName}; then
                                echo "Tagging ${localName} as ${registry}/${remoteName}"
                                docker tag ${localName}:latest ${registry}/${remoteName}:latest
                                docker tag ${localName}:latest ${registry}/${remoteName}:${commitHash}
                            else
                                echo "❌ Local image ${localName}:latest not found"
                            fi
                        """
                    }
                }
            }
        }

        stage('Push to DockerHub') {
            steps {
                echo "Logging into DockerHub and pushing images..."
                withCredentials([usernamePassword(credentialsId: "${registryCredential}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        
                        for svc in trandandan_api-gateway trandandan_auth-service trandandan_user-service; do
                          echo "🚀 Pushing $svc ..."
                          docker push ${registry}/$svc:latest
                          docker push ${registry}/$svc:${commitHash}
                        done
                    '''
                }
            }
        }
    }
}
