import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components';
import { AUTH_STRINGS } from '../locales/en/auth';

export default function SignupSuccess() {
  const t = AUTH_STRINGS;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            {/* Placeholder logo asset */}
            <img
              src="/dashup-logo.svg"
              alt="DashUp"
              width={64}
              height={64}
              className="inline-block"
            />
          </div>
          <h1 className="text-3xl font-bold text-primary">DashUp</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-center">{t.success.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <p className="text-center text-text-secondary">
                {t.success.body}
              </p>
              <div className="flex justify-center">
                <Link to={t.routes.login} aria-label={t.success.gotoLogin}>
                  <Button size="lg">{t.success.gotoLogin}</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
