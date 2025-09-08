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
                    // fallback if old docker-compose is installed
                    try {
                        sh "${composeCmd} -v"
                    } catch (e) {
                        composeCmd = "docker-compose"
                    }

                    // Build services
                    sh "${composeCmd} -f docker-compose.backend.yml build --no-cache"
                }
                sh 'docker images | grep -E "(api-gateway|auth-service|user-service)" || echo "No matching images found"'
            }
        }

        // stage('Test') {
        //     steps {
        //         echo "Starting backend services for testing..."
        //         script {
        //             def composeCmd = "docker compose"
        //             try { sh "${composeCmd} -v" } catch (e) { composeCmd = "docker-compose" }

        //             try {
        //                 sh "${composeCmd} -f docker-compose.backend.yml up -d"
        //                 sh "sleep 15" // wait for services
        //                 sh "docker ps"
        //                 sh "echo '✅ Placeholder tests passed'"
        //             } finally {
        //                 sh "${composeCmd} -f docker-compose.backend.yml down || true"
        //             }
        //         }
        //     }
        // }

        stage('Tag Images') {
            steps {
                echo "Tagging images for DockerHub..."
                script {
                    def services = ["trandandan_api-gateway", "trandandan_auth-service", "trandandan_user-service"]
                    for (svc in services) {
                        sh """
                            if docker images ${registry}/${svc}:latest --format '{{.Repository}}' | grep -q ${svc}; then
                                docker tag ${registry}/${svc}:latest ${registry}/${svc}:${commitHash}
                                echo "Tagged ${registry}/${svc}:${commitHash}"
                            else
                                echo "❌ Image ${registry}/${svc}:latest not found"
                            fi
                        """
                    }
                }
            }
        }

        stage('Push to DockerHub') {
            steps {
                echo "Pushing images to DockerHub..."
                script {
                    docker.withRegistry('https://registry.hub.docker.com', registryCredential) {
                        def services = ["trandandan_api-gateway", "trandandan_auth-service", "trandandan_user-service"]
                        for (svc in services) {
                            sh """
                                docker push ${registry}/${svc}:latest
                                docker push ${registry}/${svc}:${commitHash}
                            """
                        }
                    }
                }
            }
        }
    }

    // post {
    //     always {
    //         echo "Cleaning up Docker..."
    //         script {
    //             def composeCmd = "docker compose"
    //             try { sh "${composeCmd} -v" } catch (e) { composeCmd = "docker-compose" }
    //             sh "${composeCmd} -f docker-compose.backend.yml down --remove-orphans || true"
    //             sh "docker system prune -f || true"
    //         }
    //     }
    //     success {
    //         echo "✅ Pipeline completed successfully! Images pushed with tag: ${commitHash}"
    //     }
    //     failure {
    //         echo "❌ Pipeline failed!"
    //     }
    // }
}
