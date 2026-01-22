import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { loginSchema } from '@/lib/validations'
import { toast } from '@/components/ui/toaster'

export default function Login() {
  const { signIn, signInWithMagicLink } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const validated = loginSchema.parse({ email, password })
      const { error } = await signIn(validated.email, validated.password)
      
      if (error) {
        toast.error('Login failed', error.message)
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      toast.error('Validation error', err.errors?.[0]?.message || 'Invalid input')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLink = async () => {
    setIsLoading(true)
    try {
      const validated = loginSchema.partial({ password: true }).parse({ email })
      const { error } = await signInWithMagicLink(validated.email)
      
      if (error) {
        toast.error('Failed to send magic link', error.message)
      } else {
        setMagicLinkSent(true)
        toast.success('Magic link sent', 'Check your email for the login link')
      }
    } catch (err: any) {
      toast.error('Validation error', err.errors?.[0]?.message || 'Invalid email')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={isLoading || magicLinkSent}
              className="text-primary hover:underline"
            >
              {magicLinkSent ? 'Magic link sent! Check your email' : 'Sign in with magic link'}
            </button>
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
