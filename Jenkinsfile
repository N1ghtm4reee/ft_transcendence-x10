pipeline {
    agent any

    environment {
        registryCredential = 'DOCKERHUB_LOGIN'  // Jenkins credentials ID
        registry = 'n1ghtm4r3e'                 // DockerHub username
    }

    stages {
        stage('Checkout Source') {
            steps {
                git branch: 'main', url: 'https://github.com/N1ghtm4reee/ft_transcendence-x10.git'
            }
        }

        stage('Build Services') {
            steps {
                echo "Building all backend services..."
                sh 'docker compose -f docker-compose.backend.yml build'
            }
        }

        stage('Test') {
            steps {
                echo "Running tests..."
                // If you have test containers defined, run them here
                // For now, just bring up services and exit
                sh 'docker compose -f docker-compose.backend.yml up -d'
                sh 'sleep 10'  // give services time to start
                // Add curl, integration tests, etc.
                sh 'docker compose -f docker-compose.backend.yml down'
            }
        }

        stage('Push Images to DockerHub') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', registryCredential) {
                        // List of service images to push
                        def images = [
                            "${registry}/trandandan_api-gateway:latest",
                            "${registry}/trandandan_auth-service:latest",
                            "${registry}/trandandan_user-service:latest",
                            "${registry}/trandandan_chat-service:latest",
                            "${registry}/trandandan_game-service:latest"
                        ]
                        
                        for (img in images) {
                            echo "Pushing ${img}"
                            sh "docker push ${img}"
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            echo "Cleaning up Docker..."
            sh "docker compose -f docker-compose.backend.yml down || true"
            sh "docker system prune -af || true"
        }
    }
}
