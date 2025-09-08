pipeline {
    agent any
    environment {
        registry = "n1ghtm4r3e" // DockerHub username
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
                // Check what images were actually built
                sh 'docker images | head -10'
            }
        }
        stage('Tag Images') {
            steps {
                echo "Tagging images with DockerHub namespace..."
                script {
                    // Map the actual built image names to your DockerHub repository names
                    def services = [
                        "n1ghtm4r3e/trandandan_api-gateway": "trandandan_api-gateway",
                        "n1ghtm4r3e/trandandan_auth-service": "trandandan_auth-service", 
                        "n1ghtm4r3e/trandandan_user-service": "trandandan_user-service"
                    ]
                    
                    services.each { builtImage, repoName ->
                        sh """
                            if docker images ${builtImage}:latest --format '{{.Repository}}' | grep -q '${builtImage}'; then
                                echo "✅ Found image ${builtImage}:latest"
                                echo "Tagging as ${registry}/${repoName}:latest and ${registry}/${repoName}:${commitHash}"
                                docker tag ${builtImage}:latest ${registry}/${repoName}:latest
                                docker tag ${builtImage}:latest ${registry}/${repoName}:${commitHash}
                            else
                                echo "❌ Image ${builtImage}:latest not found"
                                echo "Available images:"
                                docker images | grep -E "(api-gateway|auth-service|user-service)"
                            fi
                        """
                    }
                }
                
                // Verify tagged images
                sh 'echo "Tagged images:" && docker images | grep ${registry}'
            }
        }
        stage('Push to DockerHub') {
            steps {
                echo "Logging into DockerHub and pushing images..."
                script {
                    withCredentials([usernamePassword(credentialsId: "${registryCredential}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh '''
                            echo "Logging into DockerHub..."
                            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                            
                            # Push each service
                            for svc in trandandan_api-gateway trandandan_auth-service trandandan_user-service; do
                                echo "🚀 Pushing ${registry}/$svc..."
                                
                                # Check if the tagged image exists before pushing
                                if docker images ${registry}/$svc:latest --format '{{.Repository}}' | grep -q "${registry}/$svc"; then
                                    docker push ${registry}/$svc:latest
                                    docker push ${registry}/$svc:${commitHash}
                                    echo "✅ Successfully pushed ${registry}/$svc"
                                else
                                    echo "❌ Tagged image ${registry}/$svc:latest not found, skipping"
                                fi
                            done
                            
                            echo "Logging out of DockerHub..."
                            docker logout
                        '''
                    }
                }
            }
        }
    }
    post {
        always {
            echo "=== Cleanup ==="
            sh 'docker system prune -f || true'
        }
        success {
            echo "✅ Pipeline completed successfully!"
        }
        failure {
            echo "❌ Pipeline failed!"
            sh 'docker images | head -10'
        }
    }
}