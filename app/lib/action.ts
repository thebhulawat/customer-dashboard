'use server'
import { sql } from '@vercel/postgres'
import { error } from 'console';
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod';
 
export type State = {
    errors?: {
        customerId?: string[], 
        amount?: string[], 
        status?: string[]
    };
    message?: string | null
}
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer'
  }),
  amount: z.coerce.number().gte(0, {message: 'Please enter an amount greater than $0'}),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status'
  }),
  date: z.string(),
});
 
const CreateInvoice = FormSchema.omit({ id: true, date: true });
 
export async function createInvoice(prevState: State, formData: FormData) {
    const validationFields = CreateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });

    if (!validationFields.success) {
        return {
            errors: validationFields.error.flatten().fieldErrors,
            message: 'Missing fields. Failed to create an invoice'
        }
    }
    const { customerId, amount, status } = validationFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
   
    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`;
    } catch (err ) {
        return {
            message: 'Database Error: failed to create invoice.',
            error: err
        }
    }
   
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }


const UpdateInvoice = FormSchema.omit({ id: true, date: true });
 
 
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  const amountInCents = amount * 100;
 
  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}`;

  } catch (err) {
    return {
        message: 'Database Error: failed to update invoice.',
        error: err
    }
  }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id:string) {
    try {
        await sql `DELETE FROM invoices where id=${id}`
    } catch (err) {
        return {
            message: 'Database Error: failed to delete invoice.',
            error: err
        }
    }
    revalidatePath('/dashboard/invoices')
}