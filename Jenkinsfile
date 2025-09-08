pipeline {
    agent any
    
    environment {
        registry = "n1ghtm4r3e" // your DockerHub username
        registryCredential = "DOCKERHUB_LOGIN" // Jenkins credential ID for DockerHub
        commitHash = "${env.GIT_COMMIT[0..6]}" // short commit hash for tagging
    }
    
    stages {
        stage('Verify Environment') {
            steps {
                echo "Verifying Docker and Docker Compose installation..."
                sh '''
                    echo "=== Docker Version ==="
                    docker --version
                    echo "=== Docker Compose Version ==="
                    docker-compose --version || docker compose version
                    echo "=== Current User ==="
                    whoami
                    echo "=== Docker Info ==="
                    docker info | head -20
                '''
            }
        }
        
        stage('Checkout Source') {
            steps {
                echo "Checking out source code..."
                git branch: 'main', url: 'https://github.com/N1ghtm4reee/ft_transcendence-x10.git'
                
                // List files to verify checkout
                sh 'ls -la'
                sh 'test -f docker-compose.backend.yml && echo "✅ Backend compose file found" || echo "❌ Backend compose file not found"'
            }
        }
        
        stage('Build') {
            steps {
                echo "Building the backend services..."
                script {
                    try {
                        // Try modern docker compose first
                        sh 'docker compose -f docker-compose.backend.yml build --no-cache'
                    } catch (Exception e1) {
                        echo "Modern 'docker compose' failed, trying legacy 'docker-compose'..."
                        try {
                            sh 'docker-compose -f docker-compose.backend.yml build --no-cache'
                        } catch (Exception e2) {
                            echo "Both docker compose methods failed. Checking file existence..."
                            sh 'pwd && ls -la docker-compose*'
                            throw e2
                        }
                    }
                }
                
                // Verify images were built
                sh 'docker images | grep -E "(api-gateway|auth-service|user-service)" || echo "No matching images found"'
            }
        }
        
        stage('Test') {
            steps {
                echo "Running tests..."
                script {
                    try {
                        // Start backend services in background for testing
                        try {
                            sh 'docker compose -f docker-compose.backend.yml up -d'
                        } catch (Exception e) {
                            sh 'docker-compose -f docker-compose.backend.yml up -d'
                        }
                        
                        // Wait for services to be ready and run tests
                        sh '''
                            echo "Waiting for services to start..."
                            sleep 15
                            
                            echo "Checking running containers:"
                            docker ps
                            
                            echo "Checking service health:"
                            docker logs $(docker ps -q --filter "name=api-gateway") --tail 10 || echo "No api-gateway logs"
                            
                            echo "✅ Tests passed (placeholder)"
                        '''
                        
                    } finally {
                        // Always cleanup, regardless of success or failure
                        try {
                            sh 'docker compose -f docker-compose.backend.yml down'
                        } catch (Exception e) {
                            sh 'docker-compose -f docker-compose.backend.yml down || true'
                        }
                    }
                }
            }
        }
        
        stage('Tag Images') {
            steps {
                echo "Tagging images for DockerHub..."
                script {
                    def services = ["api-gateway", "auth-service", "user-service"]
                    for (svc in services) {
                        sh """
                            # Check if image exists before tagging
                            if docker images ${registry}/${svc}:latest --format "table {{.Repository}}:{{.Tag}}" | grep -q latest; then
                                echo "Tagging ${svc}..."
                                docker tag ${registry}/${svc}:latest ${registry}/${svc}:${commitHash}
                                echo "✅ Tagged ${registry}/${svc}:${commitHash}"
                            else
                                echo "❌ Image ${registry}/${svc}:latest not found"
                                docker images | grep ${svc} || echo "No ${svc} images found"
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
                            try {
                                sh """
                                    echo "Pushing ${svc} images..."
                                    docker push ${registry}/${svc}:latest
                                    docker push ${registry}/${svc}:${commitHash}
                                    echo "✅ Successfully pushed ${svc}"
                                """
                            } catch (Exception e) {
                                echo "❌ Failed to push ${svc}: ${e.message}"
                                currentBuild.result = 'UNSTABLE'
                            }
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo "=== Cleanup Phase ==="
            script {
                try {
                    // Stop any running compose services
                    sh 'docker compose -f docker-compose.backend.yml down --remove-orphans || docker-compose -f docker-compose.backend.yml down --remove-orphans || true'
                    
                    // Clean up Docker system
                    sh 'docker system prune -f || true'
                    
                    // Show final Docker status
                    sh 'docker ps -a'
                    sh 'docker images | head -10'
                    
                } catch (Exception e) {
                    echo "Cleanup failed: ${e.message}"
                }
            }
        }
        success {
            echo "✅ Pipeline completed successfully!"
            echo "Images pushed to DockerHub: ${registry}/[api-gateway|auth-service|user-service]:${commitHash}"
        }
        failure {
            echo "❌ Pipeline failed!"
            sh 'docker logs $(docker ps -aq) --tail 50 || true'
        }
        unstable {
            echo "⚠️ Pipeline completed with warnings"
        }
    }
}