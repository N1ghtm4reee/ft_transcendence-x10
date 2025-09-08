pipeline {
    agent any

    environment {
        registry = "n1ghtm4r3e"
        registryCredential = "DOCKERHUB_LOGIN"
        commitHash = "${env.GIT_COMMIT[0..6]}"
    }

    stages {
        stage('Checkout Source') {
            steps {
                git branch: 'main', url: 'https://github.com/N1ghtm4reee/ft_transcendence-x10.git'
            }
        }

        stage('Build') {
            steps {
                echo "Building the backend services..."
                // Use Docker Compose container
                sh '''
                docker run --rm \
                  -v /var/run/docker.sock:/var/run/docker.sock \
                  -v $PWD:/app -w /app \
                  docker/compose:2.20.2 \
                  -f docker-compose.backend.yml build
                '''
            }
        }

        stage('Test') {
            steps {
                echo "Running tests..."
                sh '''
                docker run --rm \
                  -v /var/run/docker.sock:/var/run/docker.sock \
                  -v $PWD:/app -w /app \
                  docker/compose:2.20.2 \
                  -f docker-compose.backend.yml up -d
                # TODO: replace with real tests
                sleep 10
                docker run --rm \
                  -v /var/run/docker.sock:/var/run/docker.sock \
                  -v $PWD:/app -w /app \
                  docker/compose:2.20.2 \
                  -f docker-compose.backend.yml down
                '''
            }
        }

        stage('Push to DockerHub') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', registryCredential) {
                        def services = ["api-gateway", "auth-service", "user-service", "chat-service", "game-service", "notification-service", "tournament-service"]
                        for (svc in services) {
                            sh """
                              docker tag ${registry}/${svc}:latest ${registry}/${svc}:${commitHash}
                              docker push ${registry}/${svc}:latest
                              docker push ${registry}/${svc}:${commitHash}
                            """
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            echo "Cleaning up Docker..."
            sh 'docker system prune -af || true'
        }
    }
}
