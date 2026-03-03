import { HelpCircle, Lightbulb, FolderKanban, Building2, Users, Hash, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HelpDocumentationProps {
  collapsed?: boolean;
  isAdmin?: boolean;
}

export function HelpDocumentation({ collapsed = false, isAdmin = false }: HelpDocumentationProps) {
  return (
    <Dialog>
      <Tooltip>
        <DialogTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full p-0"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
        </DialogTrigger>
        <TooltipContent side="right">
          How to Guide
        </TooltipContent>
      </Tooltip>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            How to Guide
          </DialogTitle>
          <DialogDescription>
            Learn how to use the Project Numbering Tool effectively
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="getting-started" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 space-y-6">
            <TabsContent value="getting-started" className="mt-0 space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Welcome to Project Numbering Tool</h3>
                <p className="text-muted-foreground">
                  Your single source of truth for generating and managing project numbers across all clients.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Access Levels</h4>
                <div className="flex gap-2">
                  <Badge variant="secondary">User</Badge>
                  <Badge variant="default">Admin</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Users can create projects and clients. Admins have additional permissions to manage users, delete projects, and edit client prefixes.
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Pro Tip</p>
                    <p className="text-sm text-muted-foreground">
                      Click your avatar in the sidebar to access your profile and change your password.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="mt-0 space-y-4">
              <FeatureCard
                icon={FolderKanban}
                title="Projects"
                description="Create and manage projects with auto-generated sequential numbers"
              />
              <FeatureCard
                icon={Building2}
                title="Clients"
                description="Organize projects by client with unique prefix codes"
              />
              <FeatureCard
                icon={Hash}
                title="Auto Numbering"
                description="Project numbers are automatically generated in PREFIX-NNNN format"
              />
              {isAdmin && (
                <>
                  <FeatureCard
                    icon={Users}
                    title="User Management"
                    description="Invite users, manage roles, and reset passwords"
                    badge="Admin"
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="workflows" className="mt-0 space-y-6">
              <WorkflowSteps
                title="Creating a New Project"
                steps={[
                  "Click 'New Project' on the Projects page",
                  "Select an existing client or create a new one",
                  "The project number is auto-generated based on the client prefix",
                  "Add project name and description",
                  "Click 'Create Project' to save"
                ]}
              />
              <WorkflowSteps
                title="Adding a New Client"
                steps={[
                  "Navigate to the Clients page",
                  "Click 'New Client'",
                  "Enter a unique name and prefix (e.g., 'ABC')",
                  "The prefix will be used for all project numbers under this client"
                ]}
              />
              {isAdmin && (
                <WorkflowSteps
                  title="Managing Users (Admin)"
                  steps={[
                    "Navigate to Users in the sidebar",
                    "Click 'Invite User' to add a new user",
                    "Set their role (User or Admin)",
                    "They will receive an email to verify their account"
                  ]}
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function FeatureCard({ icon: Icon, title, description, badge, isNew }: {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  isNew?: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-medium">{title}</span>
        </div>
        <div className="flex gap-1">
          {badge && <Badge variant="secondary">{badge}</Badge>}
          {isNew && <Badge className="bg-primary hover:bg-primary/90">NEW</Badge>}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function WorkflowSteps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div>
      <h4 className="font-medium mb-3">{title}</h4>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {index + 1}
            </div>
            <p className="text-sm text-muted-foreground pt-0.5">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
