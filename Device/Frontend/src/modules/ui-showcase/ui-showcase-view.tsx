'use client';

import * as React from 'react';
import {
  CalendarIcon,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  User,
} from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="rounded-xl border bg-card p-6">{children}</div>
    </section>
  );
}

export function UiShowcaseView() {
  const [date, setDate] = React.useState<Date>();
  const [progress, setProgress] = React.useState(45);
  const [collapsibleOpen, setCollapsibleOpen] = React.useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 5));
    }, 800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Brand header */}
      <header className="border-b bg-[#000435] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#fcb038]">ShulePlus Design System</p>
            <h1 className="text-2xl font-bold">UI Component Showcase</h1>
            <p className="mt-1 text-sm text-white/70">Sample Module · Amber #FCB038 · Navy #000435</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[#fcb038]" title="Primary" />
            <div className="size-8 rounded-full border border-white/20 bg-[#000435]" title="Navy" />
            <div className="size-8 rounded-full bg-[#f8fafc]" title="Background" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {/* Buttons */}
        <Section title="Button" description="Primary actions using brand amber">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button size="icon"><Plus /></Button>
          </div>
        </Section>

        {/* Inputs & Forms */}
        <Section title="Form Controls" description="Inputs, selects, checkboxes, radio, textarea">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Enter your name" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="it">IT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Write something..." rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="terms" />
              <Label htmlFor="terms">Accept terms and conditions</Label>
            </div>
            <div className="space-y-2">
              <Label>Notification preference</Label>
              <RadioGroup defaultValue="email">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email">Email</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="sms" id="sms" />
                  <Label htmlFor="sms">SMS</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Date Picker</Label>
              <DatePicker date={date} onDateChange={setDate} />
            </div>
          </div>
        </Section>

        {/* Cards & Badges */}
        <Section title="Card & Badge">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Records</CardTitle>
                <CardDescription>Active tenant records</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">1,284</p>
              </CardContent>
              <CardFooter>
                <Badge>Active</Badge>
                <Badge variant="secondary" className="ml-2">Verified</Badge>
                <Badge variant="outline" className="ml-2">Navy</Badge>
                <Badge variant="destructive" className="ml-2">Alert</Badge>
              </CardFooter>
            </Card>
            <Card className="border-primary/30 bg-accent/30">
              <CardHeader>
                <CardTitle>Brand Card</CardTitle>
                <CardDescription>Uses accent + primary ring</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Amber primary with navy foreground text.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <Avatar>
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback className="bg-primary text-primary-foreground">SP</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">Jane Admin</CardTitle>
                  <CardDescription>Organization Admin</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </div>
        </Section>

        {/* Table */}
        <Section title="Table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { id: 'REC-001', name: 'Annual Report', status: 'Published' },
                { id: 'REC-002', name: 'Staff Directory', status: 'Draft' },
                { id: 'REC-003', name: 'Budget Summary', status: 'Review' },
              ].map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.id}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'Published' ? 'default' : 'secondary'}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm"><MoreHorizontal /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        {/* Tabs */}
        <Section title="Tabs">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 text-sm text-muted-foreground">
              Overview tab content with ShulePlus brand colors applied to active tab indicator.
            </TabsContent>
            <TabsContent value="analytics" className="mt-4 text-sm text-muted-foreground">
              Analytics charts and KPIs would go here.
            </TabsContent>
            <TabsContent value="settings" className="mt-4 text-sm text-muted-foreground">
              Module configuration settings.
            </TabsContent>
          </Tabs>
        </Section>

        {/* Dialogs & Overlays */}
        <Section title="Dialogs & Overlays" description="Dialog, Alert Dialog, Sheet, Popover, Dropdown, Tooltip">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger render={<Button variant="outline" />}>Open Dialog</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Record</DialogTitle>
                  <DialogDescription>Add a new record to your tenant workspace.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="record-name">Record Name</Label>
                  <Input id="record-name" placeholder="Enter name" />
                </div>
                <DialogFooter>
                  <Button>Save Record</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" />}>Delete Item</AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The record will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Sheet>
              <SheetTrigger render={<Button variant="outline" />}>Open Sheet</SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Side Panel</SheetTitle>
                  <SheetDescription>Slide-over panel for quick actions.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <Input placeholder="Search..." />
                  <Button className="w-full">Apply Filter</Button>
                </div>
              </SheetContent>
            </Sheet>

            <Popover>
              <PopoverTrigger render={<Button variant="outline" />}>
                <CalendarIcon className="mr-2 size-4" />
                Popover
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-sm">Quick info popover with brand styling.</p>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                Dropdown <ChevronDown className="ml-1 size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><User className="mr-2 size-4" />Profile</DropdownMenuItem>
                <DropdownMenuItem><Settings className="mr-2 size-4" />Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" />}>Hover me</TooltipTrigger>
              <TooltipContent>ShulePlus tooltip with amber ring</TooltipContent>
            </Tooltip>
          </div>
        </Section>

        {/* Command (Combobox) */}
        <Section title="Command" description="Searchable command palette">
          <Command className="rounded-lg border shadow-sm">
            <CommandInput placeholder="Search modules..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Modules">
                <CommandItem><Search className="mr-2 size-4" />Dashboard</CommandItem>
                <CommandItem><Search className="mr-2 size-4" />Records</CommandItem>
                <CommandItem><Search className="mr-2 size-4" />Reports</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </Section>

        {/* Accordion & Collapsible */}
        <Section title="Accordion & Collapsible">
          <div className="grid gap-6 md:grid-cols-2">
            <Accordion>
              <AccordionItem value="item-1">
                <AccordionTrigger>What is Sample Module?</AccordionTrigger>
                <AccordionContent>
                  A reference microservice frontend demonstrating ShulePlus tenant isolation and UI components.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Brand Colors</AccordionTrigger>
                <AccordionContent>
                  Primary: #FCB038 (Amber), Navy: #000435, Background: #F8FAFC
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen}>
              <CollapsibleTrigger render={<Button variant="outline" className="w-full justify-between" />}>
                Toggle Details
                <ChevronDown className={`size-4 transition-transform ${collapsibleOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
                Collapsible content panel — useful for expandable form sections.
              </CollapsibleContent>
            </Collapsible>
          </div>
        </Section>

        {/* Navigation & Breadcrumb */}
        <Section title="Navigation & Breadcrumb">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Sample Module</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>UI Showcase</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Getting Started</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[300px] gap-2 p-4">
                    <NavigationMenuLink className="block rounded-md p-2 hover:bg-accent">
                      <p className="font-medium">Installation</p>
                      <p className="text-xs text-muted-foreground">Set up shadcn in your module</p>
                    </NavigationMenuLink>
                    <NavigationMenuLink className="block rounded-md p-2 hover:bg-accent">
                      <p className="font-medium">Theming</p>
                      <p className="text-xs text-muted-foreground">Apply ShulePlus brand colors</p>
                    </NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink className="px-4 py-2 text-sm font-medium">Components</NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </Section>

        {/* Carousel */}
        <Section title="Carousel">
          <Carousel className="mx-auto w-full max-w-md">
            <CarouselContent>
              {['Amber Primary', 'Navy Dark', 'Light Background'].map((label, i) => (
                <CarouselItem key={label}>
                  <div
                    className="flex aspect-video items-center justify-center rounded-xl text-lg font-semibold"
                    style={{
                      background: i === 0 ? '#fcb038' : i === 1 ? '#000435' : '#f8fafc',
                      color: i === 1 ? '#f8fafc' : '#000435',
                    }}
                  >
                    {label}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </Section>

        {/* Progress & Skeleton */}
        <Section title="Progress & Skeleton">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Upload Progress</Label>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">{progress}% complete</p>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          </div>
        </Section>

        {/* Pagination */}
        <Section title="Pagination">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </Section>

        <Separator />

        <p className="pb-10 text-center text-sm text-muted-foreground">
          All 28 shadcn/ui components installed with ShulePlus brand colors · Sample Module Frontend
        </p>
      </main>
    </div>
  );
}
